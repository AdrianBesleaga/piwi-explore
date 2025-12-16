import { env, AutoTokenizer, RawImage, Tensor } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers';
import { getModelJSON, getModelFile } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2/src/utils/hub.js";
import * as ort from "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.0/dist/ort.webgpu.mjs";

const EXAMPLE_URL = "https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/transformers/tasks/car.jpg";
const INPUT_IMAGE_SIZE = [960, 960];
const HEIGHT_FACTOR = 10;
const WIDTH_FACTOR = 10;
const IMAGE_EMBED_SIZE = WIDTH_FACTOR * HEIGHT_FACTOR;
const MAX_SEQ_LENGTH = 1024;
const BASE_MODEL = "Qwen/Qwen2-VL-2B-Instruct";
const ONNX_MODEL = "pdufour/Qwen2-VL-2B-Instruct-ONNX-Q4-F16";
const QUANT = "q4f16";
const MAX_SINGLE_CHAT_LENGTH = 10;
const DEFAULT_SESSION_OPTIONS = {
    executionProviders: ["webgpu"],
    logSeverityLevel: 2,
    logVerbosityLevel: 1,
    enableProfiling: true,
    enableCpuMemArena: true,
    graphOptimizationLevel: "all",
    executionMode: "sequential",
    intraOpNumThreads: 0,
    interOpNumThreads: 0,
}

// UI Elements
const exampleButton = document.getElementById('example');
const promptInput = document.querySelector('input[type="text"]');
const status = document.getElementById('status');
const imageContainer = document.getElementById('container');
const thumb = document.getElementById('thumb');
const uploadInput = document.getElementById('upload');
const form = document.getElementById('form');
const output = document.getElementById('llm-output');

let ortSessionA, ortSessionB, ortSessionC, ortSessionD, ortSessionE;
let config;
let currentImage = '';
let currentQuery = '';

async function initializeSessions() {
    if (status) status.textContent = 'Loading model...';
    if (imageContainer) imageContainer.classList.add('disabled');

    ort.env.wasm.numThreads = 1; // Basic setup if needed

    // Create sessions
    ortSessionA = await ort.InferenceSession.create(
        await getModelFile(ONNX_MODEL, `onnx/QwenVL_A_${QUANT}.onnx`),
        DEFAULT_SESSION_OPTIONS,
    );

    ortSessionB = await ort.InferenceSession.create(
        await getModelFile(ONNX_MODEL, `onnx/QwenVL_B_${QUANT}.onnx`),
        DEFAULT_SESSION_OPTIONS,
    );

    ortSessionC = await ort.InferenceSession.create(
        await getModelFile(ONNX_MODEL, `onnx/QwenVL_C_${QUANT}.onnx`),
        DEFAULT_SESSION_OPTIONS,
    );

    config = (await getModelJSON(BASE_MODEL, "config.json"));

    if (status) status.textContent = 'Ready';
    if (status) status.classList.add('ready');

    if (uploadInput) uploadInput.disabled = false;
    if (promptInput) promptInput.disabled = false;
    if (imageContainer) imageContainer.classList.remove('disabled');
}

export function int64ToFloat16(int64Value) {
    // Convert BigInt to Number (float64)
    const float64Value = Number(int64Value);

    // Handle special cases
    if (!isFinite(float64Value)) return float64Value > 0 ? 0x7c00 : 0xfc00; // +/- infinity
    if (float64Value === 0) return 0; // Zero is represented as 0

    // Get sign, exponent, and mantissa from float64
    const sign = float64Value < 0 ? 1 : 0;
    const absValue = Math.abs(float64Value);
    const exponent = Math.floor(Math.log2(absValue));
    const mantissa = absValue / Math.pow(2, exponent) - 1;

    // Convert exponent and mantissa to float16 format
    const float16Exponent = exponent + 15; // Offset exponent by 15 (float16 bias)
    const float16Mantissa = Math.round(mantissa * 1024); // 10-bit mantissa for float16

    // Handle overflow/underflow
    if (float16Exponent <= 0) {
        // Subnormal numbers (exponent <= 0)
        return (sign << 15) | (float16Mantissa >> 1);
    } else if (float16Exponent >= 31) {
        // Overflow, set to infinity
        return (sign << 15) | 0x7c00;
    } else {
        // Normalized numbers
        return (sign << 15) | (float16Exponent << 10) | (float16Mantissa & 0x3ff);
    }
}

export function float16ToInt64(float16Value) {
    // Extract components from float16
    const sign = (float16Value & 0x8000) >> 15;
    const exponent = (float16Value & 0x7c00) >> 10;
    const mantissa = float16Value & 0x03ff;

    // Handle special cases
    if (exponent === 0 && mantissa === 0) return BigInt(0); // Zero
    if (exponent === 0x1f) return sign ? BigInt("-Infinity") : BigInt("Infinity"); // Infinity

    // Convert back to number
    let value;
    if (exponent === 0) {
        // Subnormal numbers
        value = Math.pow(2, -14) * (mantissa / 1024);
    } else {
        // Normalized numbers
        value = Math.pow(2, exponent - 15) * (1 + mantissa / 1024);
    }

    // Apply sign
    value = sign ? -value : value;

    return BigInt(Math.round(value));
}


async function handleQuery(imageUrl, query) {
    console.log('handleQuery', { imageUrl }, { query });

    try {
        if (status) status.textContent = 'Analyzing...';

        const result = await imageTextToText(imageUrl, query, (out) => {
            console.log({ out });
            if (output) output.textContent = out;
        });
    } catch (err) {
        if (status) status.textContent = 'Error processing request';
        console.error(err);
    }
}


export async function imageTextToText(
    imagePath,
    query,
    cb,
    vision = true,
) {

    const prompt_head_len = new Tensor("int64", new BigInt64Array([5n]), [1]);

    let position_ids;
    let num_decode = 0;
    let history_len = new Tensor("int64", new BigInt64Array([0n]), [1]);

    var pos_factor_v = BigInt(1 - IMAGE_EMBED_SIZE + WIDTH_FACTOR);

    let past_key_states = new ort.Tensor(
        "float16",
        new Uint16Array(
            config.num_hidden_layers *
            config.num_key_value_heads *
            MAX_SEQ_LENGTH *
            (config.hidden_size / config.num_attention_heads)
        ).fill(0),
        [
            config.num_hidden_layers,
            config.num_key_value_heads,
            MAX_SEQ_LENGTH,
            config.hidden_size / config.num_attention_heads,
        ]
    );

    let past_value_states = past_key_states;

    let attention_mask = new ort.Tensor(
        "float16",
        new Uint16Array([0xfbff]),
        [1]
    );

    let pos_factor = new Tensor("float16", new Uint16Array([0]), [1]);

    const tokenizer = await AutoTokenizer.from_pretrained(BASE_MODEL);
    const prompt = `\n<|im_start|>user\n<|vision_start|><|vision_end|>${query}<|im_end|>\n<|im_start|>assistant\n`;
    const token = await tokenizer(prompt, {
        return_tensors: "pt",
        add_generation_prompt: false,
        tokenize: true,
    }).input_ids;

    const seq_length = token.dims[1];
    let ids_len = new Tensor("int64", new BigInt64Array([BigInt(seq_length)]), [
        1,
    ]);

    let input_ids = new ort.Tensor(
        "int32",
        new Int32Array(MAX_SEQ_LENGTH).fill(0),
        [MAX_SEQ_LENGTH]
    );

    input_ids.data.set(Array.from(token.data.slice(0, seq_length), Number));

    const dummy = new ort.Tensor("int32", new Int32Array([0]), []);

    console.log("RUN SESSION B");
    let { hidden_states } = await ortSessionB.run({
        input_ids: input_ids,
        ids_len: ids_len,
    });

    console.log("RUN SESSION C");
    ({ position_ids } = await ortSessionC.run({
        dummy: dummy,
    }));

    // Process image
    if (vision) {
        let image = await RawImage.fromURL(imagePath);

        image = await image.resize(INPUT_IMAGE_SIZE[0], INPUT_IMAGE_SIZE[1]);

        image = image.rgb();

        image = image.toTensor("CHW");
        image = image.to("float32");
        image = image.div_(255.0);
        const pixel_values = image.unsqueeze(0);

        console.log("RUN SESSION A");
        const { image_embed } = await ortSessionA.run({
            pixel_values: pixel_values,
        });

        ids_len = ids_len.add(BigInt(IMAGE_EMBED_SIZE));

        const split_factor = new Tensor(
            "int32",
            new Int32Array([
                MAX_SEQ_LENGTH - Number(ids_len.item()) - IMAGE_EMBED_SIZE,
            ]),
            [1]
        );

        const ids_len_minus = new Tensor(
            "int32",
            new Int32Array([Number(ids_len.item()) - Number(prompt_head_len.item())]),
            [1]
        );

        await ortSessionA.release();
        ortSessionA = null;

        // Check if session D is already created/loaded
        if (!ortSessionD) {
            ortSessionD = await ort.InferenceSession.create(
                await getModelFile(ONNX_MODEL, `onnx/QwenVL_D_${QUANT}.onnx`),
                DEFAULT_SESSION_OPTIONS,
            );
        }

        console.log("RUN SESSION D");
        ({ hidden_states, position_ids } = await ortSessionD.run({
            "hidden_states.1": hidden_states,
            image_embed,
            ids_len,
            ids_len_minus,
            split_factor,
        }));

        // await ortSessionD.release(); // Keep D alive if we reuse? The example releases it.
        // user example releases it.
        await ortSessionD.release();
        ortSessionD = null;
    }

    let output = '';

    while (
        num_decode < MAX_SINGLE_CHAT_LENGTH &&
        Number(history_len.data[0]) < MAX_SEQ_LENGTH
    ) {
        let token_id;

        if (!ortSessionE) {
            ortSessionE = await ort.InferenceSession.create(
                await getModelFile(ONNX_MODEL, `onnx/QwenVL_E_${QUANT}.onnx`),
                { ...DEFAULT_SESSION_OPTIONS, executionProviders: ["wasm"] },
            );
        }

        console.log("RUN SESSION E");
        ({
            max_logit_ids: token_id,
            past_key_states: past_key_states,
            past_value_states: past_value_states,
        } = await ortSessionE.run({
            hidden_states,
            attention_mask,
            "past_key_states.1": past_key_states,
            "past_value_states.1": past_value_states,
            history_len,
            ids_len,
            position_ids,
            pos_factor,
        }));

        if (token_id === 151643 || token_id === 151645) {
            break;
        }

        num_decode++;
        if (num_decode < 2) {
            history_len = history_len.add(BigInt(ids_len.data[0]));

            ids_len = new ort.Tensor("int64", new BigInt64Array([1n]), [1]);

            attention_mask = new ort.Tensor("float16", new Uint16Array([0]), [1]);

            if (vision) {
                pos_factor = new Tensor(
                    "float16",
                    new Uint16Array([int64ToFloat16(pos_factor_v + ids_len.data[0])]),
                    [1]
                );
            } else {
                pos_factor = new Tensor(
                    "float16",
                    new Uint16Array([int64ToFloat16(history_len.data[0] + BigInt(1))]),
                    [1]
                );
            }

        } else {
            history_len = history_len.add(BigInt(1));
            pos_factor = pos_factor.map((v) =>
                int64ToFloat16(float16ToInt64(v) + BigInt(1))
            );
        }
        (input_ids.data)[0] = Number(token_id.data[0]);

        console.log("RUN SESSION B");
        const result_B = await ortSessionB.run({
            input_ids: input_ids,
            ids_len: ids_len,
        });
        hidden_states = result_B.hidden_states;

        if (
            !Number.isInteger(token_id.data[0]) &&
            !["bigint", "number"].includes(typeof token_id.data[0])
        ) {
            throw new Error(`Token ID is not an integer`);
        } else {
            const decoded = tokenizer.decode([...token_id.data]);
            if (cb) cb(output);
            // await scheduler?.scheduler?.yield();
            output += decoded.toString();
        }
    }
    return output;
}

// Start
initializeSessions();

// UI Event Handlers
if (exampleButton) {
    exampleButton.addEventListener('click', (e) => {
        e.preventDefault();
        currentImage = EXAMPLE_URL;
        updatePreview(currentImage);
    });
}

if (uploadInput) {
    uploadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e2) => {
            currentImage = e2.target.result;
            console.log({ currentImage });
            updatePreview(currentImage);
        };
        reader.readAsDataURL(file);
    });
}

if (promptInput) {
    promptInput.addEventListener('keypress', (e) => {
        currentQuery = e.target.value;
        console.log({ currentQuery });
    });
}

if (form) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        if (!currentImage || !currentQuery) {
            if (status) status.textContent = 'Please select an image and type a prompt';
        } else {
            if (promptInput) promptInput.disabled = true;
            if (uploadInput) uploadInput.disabled = true;
            handleQuery(currentImage, currentQuery);
        }
    });
}

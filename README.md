# PIWI - AI Document Extraction & PDF Filling

**Browser-only React PWA for automating real estate document processing**

[![Phase 1](https://img.shields.io/badge/Phase%201-Complete-success)]()
[![Build](https://img.shields.io/badge/Build-Passing-brightgreen)]()
[![Bundle Size](https://img.shields.io/badge/Bundle-124KB%20gzipped-blue)]()
[![License](https://img.shields.io/badge/License-MIT-yellow)]()

---

## 🎯 Project Overview

PIWI (Private Intelligent Workflow Interface) is a privacy-first, browser-only application that uses local AI to extract structured data from documents and automatically fill PDF templates. Perfect for real estate agents who need to process client documents and generate contracts quickly.

### Key Features

- 🤖 **Local AI Processing** - WebLLM runs models entirely in your browser
- 🔒 **100% Private** - No backend, all data stays on your device
- 📄 **Smart PDF Filling** - AI-assisted field mapping with confidence scores
- 🎨 **Template Designer** - Visual PDF template editor
- 💾 **Offline-First** - Works without internet (PWA)
- ⚡ **Fast & Modern** - Vite + React 19 + Redux Toolkit

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 21+ (or 20.19+/22.12+)
- **Chrome 113+** or **Edge 113+** (WebGPU required)

### Installation

```bash
# Clone repository
git clone <repo-url>
cd piwi-explore/my-app

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in Chrome/Edge

### Build for Production

```bash
npm run build
npm run preview
```

---

## 📁 Project Structure

```
piwi-explore/
├── my-app/                    # React application
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   ├── services/          # Business logic
│   │   ├── store/             # Redux slices
│   │   └── App.jsx            # Main app entry
│   ├── public/                # Static assets
│   └── package.json           # Dependencies
│
├── plan/                      # Implementation plan
│   ├── README.md              # Plan navigation
│   ├── architecture-plan.md   # 12-week roadmap
│   ├── phase-1-tasks.md       # Task breakdown
│   ├── implementation-status.md
│   └── PHASE-1-COMPLETE.md    # ✅ Completed
│
└── README.md                  # This file
```

---

## 🏗️ Technology Stack

### Frontend
- **React 19.2.3** - UI library with concurrent features
- **Vite 5.4.11** - Build tool with HMR
- **Tailwind CSS 4.x** - Utility-first styling
- **Redux Toolkit** - State management

### AI & ML
- **WebLLM** - Browser-based LLM (Phi-3, Llama-3)
- **ONNX Runtime Web** - CommonForms field detection
- **Tesseract.js** - OCR for images

### PDF Processing
- **pdfme** - Template creation & generation
- **PDF.js** - Text extraction

### Storage
- **Dexie** - IndexedDB wrapper
- **Redux Persist** - State persistence

---

## 📊 Implementation Status

### Phase 1: Foundation & Infrastructure ✅ COMPLETE
- [x] Vite migration
- [x] Core dependencies installed
- [x] Tailwind CSS configured
- [x] IndexedDB schema (7 stores)
- [x] Redux store (5 slices)
- [x] Browser capability detection
- [x] React Router setup
- [x] Base layout components
- [x] Unsupported browser page

**Progress:** 9/9 tasks | 100% complete

### Upcoming Phases

| Phase | Name | Status | ETA |
|-------|------|--------|-----|
| 2 | Client & Document Management | ⏳ Pending | Week 3 |
| 3 | Text Extraction Pipeline | ⏳ Pending | Week 4 |
| 4 | AI Model Management | ⏳ Pending | Week 5 |
| 5 | AI Classification & Extraction | ⏳ Pending | Week 6-7 |
| 6 | PDF Template System | ⏳ Pending | Week 8 |
| 7 | CommonForms Field Detection | ⏳ Pending | Week 9 |
| 8 | AI-Assisted Field Mapping | ⏳ Pending | Week 10 |
| 9 | PDF Generation | ⏳ Pending | Week 11 |
| 10 | PWA & Polish | ⏳ Pending | Week 12 |

---

## 🎨 Features Preview

### Dashboard
- Client statistics
- Document count
- Template management
- Quick actions

### Document Processing
1. Upload PDFs, images, or text files
2. AI extracts text (PDF.js/Tesseract)
3. AI classifies document type
4. AI extracts structured JSON data
5. View/edit extracted data

### Template Mapping
1. Upload PDF template
2. AI detects form fields (CommonForms)
3. AI suggests field mappings
4. Manual drag-drop editor
5. Generate filled PDFs

---

## 🔧 Development

### Available Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
npm test          # Run tests
```

### Environment

- Development server: `http://localhost:3000`
- Hot Module Replacement (HMR) enabled
- Redux DevTools enabled
- Source maps in development

---

## 📖 Documentation

Comprehensive planning docs in [`/plan`](./plan) folder:

- [**Architecture Plan**](./plan/architecture-plan.md) - Full 12-week implementation with 91 tickets
- [**Redux Migration**](./plan/redux-migration-rationale.md) - Why Redux over Zustand
- [**Phase 1 Tasks**](./plan/phase-1-tasks.md) - Detailed task breakdown
- [**Implementation Status**](./plan/implementation-status.md) - Progress tracking
- [**Phase 1 Complete**](./plan/PHASE-1-COMPLETE.md) - Completion report

---

## 🌐 Browser Compatibility

| Browser | Version | WebGPU | Status |
|---------|---------|--------|--------|
| Chrome | 113+ | ✅ Yes | ✅ Supported |
| Edge | 113+ | ✅ Yes | ✅ Supported |
| Safari | Any | ❌ Experimental | ❌ Not Supported |
| Firefox | Any | ❌ In Progress | ❌ Not Supported |

**Note:** WebGPU is required for local AI model inference. The app will show a compatibility warning on unsupported browsers.

---

## 🔒 Privacy & Security

### 100% Client-Side Processing
- **No backend server** - Everything runs in your browser
- **No data transmission** - All documents stay on your device
- **IndexedDB storage** - Data stored locally, not in the cloud
- **Offline-capable** - Works without internet connection

### Data Management
- Export data anytime (JSON format)
- Import data from backups
- Clear all data with one click
- No analytics or tracking

---

## ⚡ Performance

### Bundle Size
- Initial: 392 KB (124 KB gzipped)
- Target: <500 KB ✅
- Code splitting by route
- Lazy loading for heavy components

### AI Model Sizes
- Phi-3-mini: ~1.6 GB (recommended)
- Llama-3-8B: ~4.7 GB
- CommonForms: ~50 MB

Models download on first use and cache in browser.

---

## 🐛 Troubleshooting

### WebGPU Not Available
**Solution:** Use Chrome 113+ or Edge 113+. Enable WebGPU in `chrome://flags` if needed.

### IndexedDB Errors
**Solution:** Clear browser cache and cookies, then reload.

### Model Download Fails
**Solution:** Check internet connection, ensure enough storage space (~5 GB), retry download.

### Storage Quota Exceeded
**Solution:** Delete old clients, export data, clear browser cache.

---

## 🗺️ Roadmap

### MVP (Weeks 1-7)
- ✅ Foundation & infrastructure
- ⏳ Client & document management
- ⏳ Text extraction pipeline
- ⏳ AI model management
- ⏳ Document classification & extraction

### Full Feature Set (Weeks 8-11)
- ⏳ PDF template system
- ⏳ CommonForms field detection
- ⏳ AI-assisted mapping
- ⏳ PDF generation

### Production Ready (Week 12)
- ⏳ PWA configuration
- ⏳ Offline support
- ⏳ Performance optimization
- ⏳ Accessibility audit

---

## 🤝 Contributing

This is currently a private project. For questions or issues, contact the development team.

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

### Open Source Projects
- [WebLLM](https://github.com/mlc-ai/web-llm) - Browser-based LLM inference
- [CommonForms](https://github.com/jbarrow/commonforms) - PDF form field detection
- [pdfme](https://github.com/pdfme/pdfme) - PDF template generation
- [Tesseract.js](https://github.com/naptha/tesseract.js) - OCR engine
- [Dexie](https://github.com/dexie/Dexie.js) - IndexedDB wrapper
- [Redux Toolkit](https://redux-toolkit.js.org/) - State management

---

## 📧 Contact

For support or inquiries:
- Check [documentation](./plan/README.md)
- Review [architecture plan](./plan/architecture-plan.md)
- See [implementation status](./plan/implementation-status.md)

---

**Built with ❤️ using React, WebLLM, and modern web technologies**

*Last Updated: December 14, 2025*
*Phase 1: Complete ✅*

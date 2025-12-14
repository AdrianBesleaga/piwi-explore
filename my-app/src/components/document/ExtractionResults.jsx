import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ExtractionResults = ({ data, type, confidence }) => {

    if (!data && !type) {
        return (
            <div className="flex items-center justify-center h-full text-muted-foreground p-8 border rounded-lg border-dashed">
                No AI extracted data available.
            </div>
        );
    }

    const renderValue = (value) => {
        if (Array.isArray(value)) {
            return (
                <ul className="list-disc list-inside">
                    {value.map((item, i) => (
                        <li key={i}>{typeof item === 'object' ? JSON.stringify(item) : item}</li>
                    ))}
                </ul>
            );
        }
        if (typeof value === 'object' && value !== null) {
            return <pre className="text-xs">{JSON.stringify(value, null, 2)}</pre>;
        }
        return value ? String(value) : <span className="text-gray-400 italic">null</span>;
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium uppercase text-muted-foreground">Classification</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4">
                        <div className="grid gap-1">
                            <span className="text-sm font-semibold">Document Type</span>
                            <Badge variant="outline" className="w-fit text-lg capitalize px-3 py-1">
                                {type || 'Unknown'}
                            </Badge>
                        </div>
                        {confidence && (
                            <div className="grid gap-1">
                                <span className="text-sm font-semibold">Confidence</span>
                                <span className="text-sm text-muted-foreground">{(confidence * 100).toFixed(1)}%</span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="flex-1">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Extracted Data</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <ScrollArea className="h-[400px]">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[200px]">Field</TableHead>
                                    <TableHead>Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data ? Object.entries(data).map(([key, value]) => (
                                    <TableRow key={key}>
                                        <TableCell className="font-medium font-mono text-xs">{key}</TableCell>
                                        <TableCell>{renderValue(value)}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                                            No structured data found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
};

export default ExtractionResults;

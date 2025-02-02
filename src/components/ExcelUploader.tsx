import React from 'react';
import * as XLSX from 'xlsx';
import { Upload } from 'lucide-react';

interface Employee {
  employee_id: string;
  name: string;
  designation: string;
  email: string;
  company_id: string;
}

interface ExcelUploaderProps {
  onUpload: (employees: Omit<Employee, 'company_id'>[]) => void;
  onError: (error: string) => void;
}

export default function ExcelUploader({ onUpload, onError }: ExcelUploaderProps) {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Validate and transform the data
        const employees = jsonData.map((row: any) => {
          if (!row.employee_id || !row.name || !row.designation || !row.email) {
            throw new Error('Invalid Excel format. Required columns: employee_id, name, designation, email');
          }

          return {
            employee_id: row.employee_id.toString(),
            name: row.name,
            designation: row.designation,
            email: row.email,
          };
        });

        onUpload(employees);
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Failed to process Excel file');
      }
    };

    reader.onerror = () => {
      onError('Failed to read file');
    };

    reader.readAsBinaryString(file);
  };

  return (
    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
      <div className="space-y-1 text-center">
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <div className="flex text-sm text-gray-600">
          <label
            htmlFor="file-upload"
            className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
          >
            <span>Upload Excel file</span>
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              className="sr-only"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
            />
          </label>
          <p className="pl-1">or drag and drop</p>
        </div>
        <p className="text-xs text-gray-500">Excel files only (.xlsx, .xls)</p>
      </div>
    </div>
  );
} 
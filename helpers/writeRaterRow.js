import * as XLSX from "xlsx";

export function writeRaterRow(sheet, data, index) {
  const headers = Object.keys(data);

  // Row number (start writing from row 2)
  const rowNumber = index + 2;

  headers.forEach((header, colIndex) => {
    const cellAddress = XLSX.utils.encode_cell({
      r: rowNumber - 1,
      c: colIndex
    });

    sheet[cellAddress] = {
      v: data[header]
    };
  });
}
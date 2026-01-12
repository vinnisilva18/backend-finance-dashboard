// frontend/src/utils/export.js
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import * as XLSX from 'xlsx'

pdfMake.vfs = pdfFonts.pdfMake.vfs

export function exportToPDF(data, columns, title) {
  const docDefinition = {
    content: [
      { text: title, style: 'header' },
      {
        table: {
          headerRows: 1,
          widths: columns.map(() => '*'),
          body: [
            columns.map(col => col.label),
            ...data.map(row => columns.map(col => row[col.field]))
          ]
        }
      }
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 10]
      }
    }
  }
  
  pdfMake.createPdf(docDefinition).download(`${title.toLowerCase().replace(/\s+/g, '-')}.pdf`)
}

export function exportToExcel(data, filename) {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}
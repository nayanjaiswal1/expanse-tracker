interface ParsedData {
  file_name: string;
  num_pages: number;
  pages: PageData[];
}

interface PageData {
  page_number: number;
  text_blocks: TextBlock[];
  tables: Table[];
}

interface TextBlock {
  bbox: [number, number, number, number];
  text: string;
  type: string;
}

interface Table {
  bbox: [number, number, number, number];
  rows: string[][];
  row_count: number;
  col_count: number;
}

interface ParsedDataViewerProps {
  data: ParsedData;
}

export function ParsedDataViewer({ data }: ParsedDataViewerProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Parsed Data</h2>
      <p>
        <strong>File:</strong> {data.file_name}
      </p>
      <p>
        <strong>Total Pages:</strong> {data.num_pages}
      </p>

      {data.pages.map((page) => (
        <div key={page.page_number} className="p-4 border rounded-lg space-y-4">
          <h3 className="text-xl font-semibold">Page {page.page_number}</h3>

          {page.tables.length > 0 && (
            <div>
              <h4 className="text-lg font-medium mb-2">Tables</h4>
              {page.tables.map((table, tableIndex) => (
                <div key={tableIndex} className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border">
                    <tbody className="bg-white divide-y divide-gray-200">
                      {table.rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} className="px-4 py-2 text-sm border-l">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {page.text_blocks.length > 0 && (
            <div>
              <h4 className="text-lg font-medium mb-2">Text Blocks</h4>
              <div className="space-y-2">
                {page.text_blocks.map((block, blockIndex) => (
                  <p key={blockIndex} className="p-2 bg-gray-50 rounded text-sm">
                    {block.text}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

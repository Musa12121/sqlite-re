import { readFile, writeFile } from "node:fs/promises";
import { parseCsv, stringifyCsv } from "./csvParse.ts";

export class MySqliteRequest {
    private filePath: string = "";
    private columns: string[] = [];
    private conditions: { column: string, value: string }[] = [];
    private ordering: {
        column: string;
        order: "ASC" | "DESC";
    } | null = null;
    private operation: "select" | "delete" | "insert" = "select";

    private newRow: Record<string, string> | null = null;

    from(filePath: string) {
        this.filePath = filePath;
        return this
    }

    select(...columns: string[]) {
        this.columns = columns;
        return this
    }

    where(key: string, value: string) {
        this.conditions.push({ column: key, value })
        return this
    }

    order_by(column: string, order: "ASC" | "DESC" = "ASC") {
        this.ordering = { column, order };
        return this
    }

    delete() {
        this.operation = 'delete'
        return this
    }

    insert(csvFilePath: string): this {
        this.operation = "insert"
        this.filePath = csvFilePath
        return this
    }

    values(row: Record<string, string>): this {
        this.newRow = row;
        return this
    }

    async run() {
        const file = await readFile(this.filePath, 'utf8');
        const { headers, rows } = parseCsv(file);

        if (this.operation === "insert") {
            if (this.newRow === null) {
                throw new Error("Provide a row using values()");
            }
            rows.push(this.newRow)
            // 1. Append this.newRow to rows using push().
            // 2. Convert headers and rows to CSV using stringifyCsv().
            // 3. Save the CSV using await writeFile().
            return rows
        }

        this.columns.forEach(column => {
            if (column !== "*" && !headers.includes(column)) {
                throw new Error(`Unknown column: ${column}`);
            };
        })

        this.conditions.forEach(condition => {
            if (!headers.includes(condition.column)) { throw new Error(`Unknown column: ${condition.column}`) }
        })




        const filteredRows = rows.filter(row => this.conditions.every(condition => row[condition.column] === condition.value));

        if (this.operation === "delete") {
            const remainingRows = rows.filter(row => {
                const matches = this.conditions.every(condition =>
                    row[condition.column] === condition.value
                );

                return !matches
            });

            const csv = stringifyCsv(headers, remainingRows);
            await writeFile(this.filePath, csv, "utf8");

            return remainingRows;
        }


        if (this.ordering != null) {
            if (!headers.includes(this.ordering?.column)) { throw new Error(`Unknown column: ${this.ordering.column}`) }
            const { column, order } = this.ordering;

            const isNumeric = filteredRows.every(row =>
                !Number.isNaN(Number(row[column]))
            );

            if (!isNumeric) {
                if (this.ordering.order === "ASC") {
                    filteredRows.sort((a: Record<string, string>, b: Record<string, string>) => a[this.ordering.column].localeCompare(b[this.ordering.column]))
                }
                else {
                    filteredRows.sort((a: Record<string, string>, b: Record<string, string>) => b[this.ordering.column].localeCompare(a[this.ordering.column]))
                }
            }
            else {
                if (this.ordering.order === "ASC") {
                    filteredRows.sort((a: Record<string, string>, b: Record<string, string>) => Number(a[this.ordering?.column]) - Number(b[this.ordering?.column]))
                }
                else {
                    filteredRows.sort((a: Record<string, string>, b: Record<string, string>) => Number(b[this.ordering?.column]) - Number(a[this.ordering?.column]))
                }
            }
        }

        if (this.columns.length === 0 || this.columns[0] === "*") {
            return filteredRows;
        }


        const selectedRows = filteredRows.map(row => {
            const selectedRow = {};

            this.columns.forEach(column => selectedRow[column] = row[column]);
            return selectedRow
        });


        return selectedRows;
    }
}
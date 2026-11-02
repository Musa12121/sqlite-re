import { readFile, writeFile } from "node:fs/promises";
import { parseCsv, stringifyCsv } from "./csvParse.ts";
import { basename, extname } from "node:path";

export class MySqliteRequest {
  private filePath: string = "";
  private columns: string[] = [];
  private conditions: { column: string; value: string }[] = [];
  private ordering: {
    column: string;
    order: "ASC" | "DESC";
  } | null = null;
  private operation: "select" | "delete" | "insert" | "update" = "select";

  private joinDetails: {
    column1: string;
    csvFile: string;
    column2: string;
  } | null = null;

  private newRow: Record<string, string> | null = null;
  private updateValue: Record<string, string> | null = null;

  from(filePath: string) {
    this.filePath = filePath;
    return this;
  }

  select(...columns: string[]) {
    this.columns = columns;
    return this;
  }

  where(key: string, value: string) {
    this.conditions.push({ column: key, value });
    return this;
  }

  order_by(column: string, order: "ASC" | "DESC" = "ASC") {
    this.ordering = { column, order };
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  insert(csvFilePath: string): this {
    this.operation = "insert";
    this.filePath = csvFilePath;
    return this;
  }

  values(row: Record<string, string>): this {
    this.newRow = row;
    return this;
  }

  update(tableName: string) {
    this.operation = "update";
    this.filePath = tableName;
    return this;
  }

  set(column: string, value: string) {
    this.updateValue = { column, value };
    return this;
  }

  join(column1: string, csvFile: string, column2: string) {
    this.joinDetails = { column1, csvFile, column2 };
    return this;
  }

  async run() {
    const file = await readFile(this.filePath, "utf8");
    let { headers, rows } = parseCsv(file);

    if (this.joinDetails !== null) {
      const joinFile = await readFile(this.joinDetails.csvFile, "utf8");
      const { column1, column2 } = this.joinDetails!;
      const { rows: otherRows, headers: joinHeaders } = parseCsv(joinFile);
      const mainTable = basename(this.filePath, extname(this.filePath));
      const otherTable = basename(
        this.joinDetails!.csvFile,
        extname(this.joinDetails!.csvFile),
      );

      const duplicateHeaders = headers.filter((header) =>
        joinHeaders.includes(header),
      );

      const joinedRows: Record<string, string>[] = [];

      for (const row of rows) {
        for (const otherRow of otherRows) {
          if (row[column1] === otherRow[column2]) {
            const joinedRow: Record<string, string> = {
              ...row,
              ...otherRow,
            };

            for (const header of duplicateHeaders) {
              joinedRow[`${mainTable}.${header}`] = row[header];
              joinedRow[`${otherTable}.${header}`] = otherRow[header];
              delete joinedRow[header];
            }

            joinedRows.push(joinedRow);
          }
        }
      }

      rows = joinedRows;
      headers = [
        ...headers.map((header) =>
          duplicateHeaders.includes(header) ? `${mainTable}.${header}` : header,
        ),
        ...joinHeaders.map((header) =>
          duplicateHeaders.includes(header)
            ? `${otherTable}.${header}`
            : header,
        ),
      ];
    }

    if (this.operation === "insert") {
      if (this.newRow === null) {
        throw new Error("Provide a row using values()");
      }
      rows.push(this.newRow);
      await writeFile(this.filePath, stringifyCsv(headers, rows));
      return rows;
    }

    this.columns.forEach((column) => {
      if (column !== "*" && !headers.includes(column)) {
        throw new Error(`Unknown column: ${column}`);
      }
    });

    this.conditions.forEach((condition) => {
      if (!headers.includes(condition.column)) {
        throw new Error(`Unknown column: ${condition.column}`);
      }
    });

    const filteredRows = rows.filter((row) =>
      this.conditions.every(
        (condition) => row[condition.column] === condition.value,
      ),
    );

    if (this.operation === "delete") {
      const remainingRows = rows.filter((row) => {
        const matches = this.conditions.every(
          (condition) => row[condition.column] === condition.value,
        );

        return !matches;
      });

      const csv = stringifyCsv(headers, remainingRows);
      await writeFile(this.filePath, csv, "utf8");

      return remainingRows;
    } else if (this.operation === "update") {
      if (this.updateValue === null) {
        throw new Error();
      }
      filteredRows.forEach((row) => {
        row[this.updateValue.column] = this.updateValue.value;
        return row;
      });
      writeFile(this.filePath, stringifyCsv(headers, rows));
      return rows;
    }

    if (this.ordering != null) {
      if (!headers.includes(this.ordering?.column)) {
        throw new Error(`Unknown column: ${this.ordering.column}`);
      }
      const { column, order } = this.ordering;

      const isNumeric = filteredRows.every(
        (row) => !Number.isNaN(Number(row[column])),
      );

      if (!isNumeric) {
        if (this.ordering.order === "ASC") {
          filteredRows.sort(
            (a: Record<string, string>, b: Record<string, string>) =>
              a[this.ordering.column].localeCompare(b[this.ordering.column]),
          );
        } else {
          filteredRows.sort(
            (a: Record<string, string>, b: Record<string, string>) =>
              b[this.ordering.column].localeCompare(a[this.ordering.column]),
          );
        }
      } else {
        if (this.ordering.order === "ASC") {
          filteredRows.sort(
            (a: Record<string, string>, b: Record<string, string>) =>
              Number(a[this.ordering?.column]) -
              Number(b[this.ordering?.column]),
          );
        } else {
          filteredRows.sort(
            (a: Record<string, string>, b: Record<string, string>) =>
              Number(b[this.ordering?.column]) -
              Number(a[this.ordering?.column]),
          );
        }
      }
    }

    if (this.columns.length === 0 || this.columns[0] === "*") {
      return filteredRows;
    }

    const selectedRows = filteredRows.map((row) => {
      const selectedRow = {};

      this.columns.forEach((column) => (selectedRow[column] = row[column]));
      return selectedRow;
    });

    return selectedRows;
  }
}

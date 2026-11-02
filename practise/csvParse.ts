export function escapeCsvValue(value: string): string {
    if (
        value.includes(",") ||
        value.includes('"') ||
        value.includes("\n") ||
        value.includes("\r")
    ) {
        return '"' + value.replaceAll('"', '""') + '"';
    }

    return value;
}

export function parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let currentField = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') {
            if (insideQuotes && line[i + 1] === '"') { currentField += '"' }
            else { insideQuotes = !insideQuotes; }
        }
        else if (line[i] === "," && !insideQuotes) {
            fields.push(currentField);
            currentField = "";
        } else {
            currentField += line[i];
        }
    }
    if (insideQuotes) {
        throw new Error("Missing closing quote");
    }
    fields.push(currentField)

    return fields;
}

export function parseCsv(file: string) {
    const lines = file.trim().split(/\r?\n/);
    const headers = parseCsvLine(lines[0]);
    const body = lines.slice(1);
    const rows = body.map((line) => {
        const formatted = parseCsvLine(line);
        const row: Record<string, string> = {};

        headers.forEach((header: string, index: number) => {
            row[header] = formatted[index];
        });

        return row;
    });

    return { headers, rows };
}

export function stringifyCsv(
    headers: string[],
    rows: Record<string, string>[]
): string {
    const headerLine = headers.map(escapeCsvValue).join(",");

    const dataLines = rows.map(row => {
        return headers
            .map(header => escapeCsvValue(row[header]))
            .join(",");
    });

    return [headerLine, ...dataLines].join("\n") + "\n";
}
function formatSchemaJSON(tables) {
    const schema = {};
    for (const table of tables) {
        schema[table.name] = table.columns.map((c) => `${c.name} (${c.type}${c.nullable ? ', nullable' : ''}${c.isPrimaryKey ? ', PK' : ''}${c.isForeignKey && c.references ? `, FK → ${c.references.table}.${c.references.column}` : ''})`);
    }
    return JSON.stringify(schema, null, 2);
}
function formatTableDescriptions(descriptions) {
    const lines = [];
    for (const [tableName, desc] of Object.entries(descriptions)) {
        if (desc.description) {
            lines.push(`${tableName}: ${desc.description}`);
        }
        if (desc.columns) {
            for (const [colName, colDesc] of Object.entries(desc.columns)) {
                lines.push(`  ${tableName}.${colName}: ${colDesc}`);
            }
        }
    }
    return lines.join('\n');
}
export function buildPrompt(schema, dialect, allowedTables, tableDescriptions) {
    const filteredTables = schema.tables.filter((t) => allowedTables.map((n) => n.toLowerCase()).includes(t.name.toLowerCase()));
    const schemaJSON = formatSchemaJSON(filteredTables);
    let prompt = `You are a SQL generation assistant. Your ONLY job is to convert natural language questions into valid, safe SQL queries.

DATABASE DIALECT: ${dialect}

SCHEMA:
${schemaJSON}
`;
    if (tableDescriptions && Object.keys(tableDescriptions).length > 0) {
        const descriptionsText = formatTableDescriptions(tableDescriptions);
        prompt += `
BUSINESS CONTEXT:
${descriptionsText}

Use the business context above to understand abbreviated or domain-specific column names.
`;
    }
    prompt += `
RULES — follow these without exception:
1. Only generate SELECT statements. Never generate INSERT, UPDATE, DELETE, DROP, ALTER, or any other mutating statement.
2. Only reference tables and columns that exist in the schema above. Never hallucinate table or column names.
3. Never call database functions that access the filesystem or execute system commands.
4. Always add a LIMIT clause. Default to LIMIT 100 unless the user explicitly asks for more.
5. Never use SELECT * — always name the columns explicitly.
6. If the question cannot be answered with the available schema, say exactly: CANNOT_ANSWER: <reason>

OUTPUT FORMAT — respond with exactly this structure, nothing else:
EXPLANATION: <one sentence explaining what the query does, in plain English for a non-technical user>
CONFIDENCE: <HIGH if you matched exact column names from the schema, MEDIUM if you had to interpret/infer, LOW if you're uncertain>
SQL:
<the SQL query>`;
    return prompt;
}
export function buildSuggestPrompt(schema, allowedTables, count) {
    const filteredTables = schema.tables.filter((t) => allowedTables.map((n) => n.toLowerCase()).includes(t.name.toLowerCase()));
    const schemaJSON = formatSchemaJSON(filteredTables);
    return `You are a helpful assistant. Given the following database schema, generate exactly ${count} example natural language questions that a user could ask to query this data. The questions should be diverse, practical, and answerable with the schema provided.

SCHEMA:
${schemaJSON}

Return ONLY a JSON array of strings, nothing else. Example:
["Question 1?", "Question 2?", "Question 3?"]`;
}
//# sourceMappingURL=builder.js.map
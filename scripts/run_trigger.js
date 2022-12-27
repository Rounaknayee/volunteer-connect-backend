import fs from 'fs';
import path from 'path';

import { PrismaClient } from '@prisma/client';
import { exit } from 'process';

const prisma = new PrismaClient();

async function main() {

    const __dirname = path.resolve();
    
    let sql_file = path.join(__dirname, '/scripts/triggers.sql');

    try {
        const rawSql = await fs.promises.readFile(sql_file, {
            encoding: 'utf-8',
        });
        const sqlReducedToStatements = rawSql
            .split('\n')
            .filter((line) => !line.startsWith('--')) // remove comments-only lines
            .join('\n')
            .replace(/\r\n|\n|\r/g, ' ') // remove newlines
            .replace(/\s+/g, ' '); // excess white space
        const sqlStatements = splitStringByNotQuotedSemicolon(sqlReducedToStatements);
    
        for (const sql of sqlStatements) {
            console.log(sql);
            await prisma.$executeRawUnsafe(sql);
        }
        } catch (e) {
        console.error(e);
        process.exit(1);
        } finally {
        await prisma.$disconnect();
        }
  }
  
  function splitStringByNotQuotedSemicolon(input) {
    const result = [];
  
    let currentSplitIndex = 0;
    let isInString = false;
    for (let i = 0; i < input.length; i++) {
      if (input[i] === "'") {
        // toggle isInString
        isInString = !isInString;
      }
      if (input[i] === ';' && !isInString) {
        result.push(input.substring(currentSplitIndex, i + 1));
        currentSplitIndex = i + 2;
      }
    }
  
    return result;
  }
  
  void main();
/**
 * Resume Generator using Claude Agent SDK
 *
 * This example uses web search to research a person and generates
 * a professional 1-page resume as a .docx file.
 *
 * Usage: npx tsx resume-generator.ts "Person Name"
 */

import { query } from '@anthropic-ai/claude-agent-sdk';
import * as fs from 'fs';
import * as path from 'path';

const SYSTEM_PROMPT = `You are a professional resume writer. Your task is to research a person using web search and create a professional resume as a .docx file that fits EXACTLY on 1 page.

WORKFLOW:
1. Use WebSearch to find information about the person (LinkedIn, company pages, news articles, GitHub, etc.)
2. Gather: current role, company, past experience, education, skills
3. Write a JavaScript file that uses the docx library to generate the resume
4. Run the script to create the .docx file

CRITICAL PAGE LENGTH RULES:
- The resume MUST fit on EXACTLY 1 page - not more, not less
- Use 0.5 inch margins (720 twips) to maximize space
- Use compact font sizes: Name 24pt, Headers 12pt bold, Body 10pt
- Use minimal spacing: 100-150 twips between sections
- Keep bullet points SHORT (one line each, ~80-100 characters max)
- Limit to 2-3 bullet points per job
- Professional Summary should be 2 sentences max

CONTENT GUIDELINES FOR 1 PAGE:
- Name + Contact: 2 lines
- Professional Summary: 2-3 lines
- Experience: 3 roles max, 2-3 SHORT bullets each
- Education: 2-3 lines total
- Skills: 2 lines max
- NO additional sections like Awards unless space permits

Write the docx generation script to: agent/custom_scripts/generate_resume.js
Output the resume to: agent/custom_scripts/resume.docx

When writing the script, use this pattern:
\`\`\`javascript
import { Document, Packer, Paragraph, TextRun, AlignmentType } from 'docx';
import fs from 'fs';

const doc = new Document({
  sections: [{
    properties: {
      page: {
        margin: { top: 720, right: 720, bottom: 720, left: 720 }  // 0.5 inch margins
      }
    },
    children: [
      // Keep content compact - aim for ~45-50 lines of content
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('resume.docx', buffer);
  console.log('Resume saved to resume.docx');
});
\`\`\`

IMPORTANT: Must be EXACTLY 1 page. Err on the side of LESS content rather than spilling onto page 2.`;

async function generateResume(personName: string) {
  console.log(`\n📝 Generating resume for: ${personName}\n`);
  console.log('='.repeat(50));

  // Ensure the output directory exists
  const outputDir = path.join(process.cwd(), 'agent', 'custom_scripts');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const prompt = `Research "${personName}" and create a professional 1-page resume as a .docx file. Search for their professional background, experience, education, and skills.`;

  console.log('\n🔍 Researching and creating resume...\n');

  const q = query({
    prompt,
    options: {
      maxTurns: 30,
      cwd: process.cwd(),
      model: 'sonnet',
      allowedTools: ['WebSearch', 'WebFetch', 'Bash', 'Write', 'Read', 'Glob'],
      systemPrompt: SYSTEM_PROMPT,
    },
  });

  for await (const msg of q) {
    if (msg.type === 'assistant' && msg.message) {
      for (const block of msg.message.content) {
        if (block.type === 'text') {
          console.log(block.text);
        }
        if (block.type === 'tool_use') {
          if (block.name === 'WebSearch' && block.input && typeof block.input === 'object' && 'query' in block.input) {
            console.log(`\n🔍 Searching: "${block.input.query}"`);
          } else {
            console.log(`\n🔧 Using tool: ${block.name}`);
          }
        }
      }
    }
    if (msg.type === 'result') {
      if (msg.subtype === 'tool_result') {
        const resultStr = JSON.stringify(msg.content).slice(0, 200);
        console.log(`   ↳ Result: ${resultStr}${resultStr.length >= 200 ? '...' : ''}`);
      }
    }
  }

  // Check if resume was created
  const expectedPath = path.join(process.cwd(), 'agent', 'custom_scripts', 'resume.docx');
  if (fs.existsSync(expectedPath)) {
    console.log('\n' + '='.repeat(50));
    console.log(`📄 Resume saved to: ${expectedPath}`);
    console.log('='.repeat(50) + '\n');
  } else {
    console.log('\n❌ Resume file was not created. Check the output above for errors.');
  }
}

// Main entry point
const personName = process.argv[2];
if (!personName) {
  console.log('Usage: npx tsx resume-generator.ts "Person Name"');
  console.log('Example: npx tsx resume-generator.ts "Jane Doe"');
  process.exit(1);
}

generateResume(personName).catch(console.error);

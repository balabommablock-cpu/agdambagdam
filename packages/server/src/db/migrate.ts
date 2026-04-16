import fs from 'fs';
import path from 'path';
import { pool } from './pool';
import crypto from 'crypto';

async function migrate() {
  console.log('Running migrations...');

  const schemaPath = path.join(__dirname, 'schema.sql');
  // In dev (tsx), __dirname points to src/db. In built (node), it points to dist/db.
  // Try src first, fall back to dist-relative.
  let sql: string;
  try {
    sql = fs.readFileSync(schemaPath, 'utf-8');
  } catch {
    const altPath = path.join(__dirname, '..', '..', 'src', 'db', 'schema.sql');
    sql = fs.readFileSync(altPath, 'utf-8');
  }

  await pool.query(sql);
  console.log('Schema applied successfully.');

  // Create default org and project for quick start
  const defaultApiKey = process.env.DEFAULT_API_KEY || `abacus_${crypto.randomBytes(16).toString('hex')}`;

  const orgResult = await pool.query(
    `INSERT INTO organizations (name, api_key)
     VALUES ('Default Organization', $1)
     ON CONFLICT (api_key) DO UPDATE SET name = 'Default Organization'
     RETURNING id, api_key`,
    [defaultApiKey]
  );

  const orgId = orgResult.rows[0].id;
  const apiKey = orgResult.rows[0].api_key;

  const projectResult = await pool.query(
    `INSERT INTO projects (org_id, name)
     SELECT $1, 'Default Project'
     WHERE NOT EXISTS (
       SELECT 1 FROM projects WHERE org_id = $1 AND name = 'Default Project'
     )
     RETURNING id`,
    [orgId]
  );

  if (projectResult.rows.length > 0) {
    console.log(`Default project created: ${projectResult.rows[0].id}`);
  } else {
    console.log('Default project already exists.');
  }

  console.log(`\nSetup complete!`);
  console.log(`API Key: ${apiKey}`);
  console.log(`Organization ID: ${orgId}`);

  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

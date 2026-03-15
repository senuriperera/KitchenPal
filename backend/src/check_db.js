const db = require('./config/database');
const fs = require('fs');

async function check() {
  try {
    const res = await db.query("SELECT column_name, column_default, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'notifications'");
    const seq = await db.query("SELECT * FROM pg_class WHERE relkind = 'S' AND relname LIKE 'notification%'");
    
    fs.writeFileSync('/app/src/db_out.json', JSON.stringify({ columns: res.rows, sequences: seq.rows }, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();

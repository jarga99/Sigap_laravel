import { query } from './src/lib/db.js';

async function checkData() {
  try {
    const categories = await query('SELECT * FROM Category');
    const links = await query('SELECT COUNT(*) as count FROM Link');
    
    console.log('--- RINGKASAN DATA SAAT INI ---');
    console.log(`Jumlah Kategori: ${categories.length}`);
    console.log(`Jumlah Tautan (Link): ${links[0]?.count || 0}`);
    console.log('------------------------------');
    
    if (categories.length > 0) {
      console.log('Contoh Kategori:', categories.slice(0, 3).map((c: any) => c.name).join(', '));
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Gagal membaca database:', err);
    process.exit(1);
  }
}

checkData();

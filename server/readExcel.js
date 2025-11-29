const XLSX = require('xlsx');
const path = require('path');

try {
  // Read the Excel file
  const workbook = XLSX.readFile(path.join(__dirname, '..', 'SubscriptionUseCase_Dataset.xlsx'));
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  console.log('📊 Excel data found:', data.length, 'rows');
  console.log('\n📋 Sample of Excel data:');
  console.log(JSON.stringify(data.slice(0, 3), null, 2));
  
  // Check for plan-related data
  if (data.length > 0) {
    console.log('\n🔑 Available columns:');
    Object.keys(data[0]).forEach(key => console.log(`  - ${key}`));
    
    // Look for plan names/types
    const uniquePlans = [...new Set(data.map(row => row.plan_name || row.planName || row.Plan || row.name))].filter(Boolean);
    console.log('\n🎯 Unique plans found:', uniquePlans.length);
    uniquePlans.forEach((plan, i) => console.log(`  ${i+1}. ${plan}`));
  }
  
} catch (error) {
  console.error('❌ Error reading Excel file:', error.message);
}
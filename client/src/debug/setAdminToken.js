// Debug script to set ADMIN authentication token in localStorage
// Run this in browser console on the admin page to authenticate as admin

const adminToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4Y2JkNDYyYmExMjVhYzU0YThkNzJkYSIsInJvbGUiOiJhZG1pbiIsImVtYWlsIjoiYWRpdHlhdXRzYXYxOTAxQGdtYWlsLmNvbSIsImlhdCI6MTc2MzE5ODg4MCwiZXhwIjoxNzYzMjAyNDgwfQ.BLdCwjp9U3k5ZImRgs_lcd1xoMjMcvoBnDEeS0hNryA";

// Set tokens for admin
localStorage.setItem('access_token', adminToken);
localStorage.setItem('userId', '68cbd462ba125ac54a8d72da');

console.log('ADMIN token set successfully!');
console.log('Email: adityautsav1901@gmail.com');
console.log('Password: admin123');
console.log('Token expires in 1 hour');
console.log('Refresh the page to see admin data');

// Optionally reload the page
window.location.reload();
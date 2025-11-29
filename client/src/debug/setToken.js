// Debug script to set authentication token in localStorage
// Run this in browser console to authenticate with the backend

const validToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MTU4MjBlYWVmMjAzZTJiMzUzMmYzYiIsInJvbGUiOiJjdXN0b21lciIsImVtYWlsIjoiYWRpdHlhMUBnbWFpbC5jb20iLCJpYXQiOjE3NjMxOTQ1NjYsImV4cCI6MTc2MzE5ODE2Nn0.AaS4cJs7dHffs38t295yf2x9ZnYXTBcE1irx_ufoEt4";

// Set tokens
localStorage.setItem('access_token', validToken);
localStorage.setItem('userId', '6915820eaef203e2b3532f3b');

console.log('Token set successfully!');
console.log('Token expires in 1 hour');
console.log('Refresh the page to see authenticated data');

// Optionally reload the page
window.location.reload();
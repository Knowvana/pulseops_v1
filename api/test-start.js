import createApp from './src/app.js';
const app = createApp();
app.listen(4001, () => {
  console.log('TEST: API started on port 4001');
  console.log('TEST: Hit http://localhost:4001/api/health to verify');
});

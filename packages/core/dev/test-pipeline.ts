import { onFileSaved, onError } from '../src/pipeline';

async function main() {
  onFileSaved('C:/dev/demo/auth.py');
  await new Promise(r => setTimeout(r, 50));

  const err = {
    type: 'error.reported' as const,
    errorId: 'e1',
    message: "TypeError: 'NoneType' object is not subscriptable",
    file: 'C:/dev/demo/auth.py',
    line: 88,
    column: 3,
    language: 'python',
    severity: 'error',
  };

  console.log('--- sending the SAME error 3 times, 150ms apart ---');
  onError(err, 500);
  await new Promise(r => setTimeout(r, 150));
  onError(err, 500);
  await new Promise(r => setTimeout(r, 150));
  onError(err, 500);

  await new Promise(r => setTimeout(r, 900));
  console.log('--- done ---');
}

main();
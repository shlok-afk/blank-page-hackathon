// Hardcoded explanations so the panel can be built before the core exists.
export const SAMPLES = [
  {
    id: 'sample-py-nameerror',
    title: "NameError: name 'pritn' is not defined",
    location: 'main.py:4 · Pylance',
    text: `Python doesn't know anything called \`pritn\`. This is almost always a **typo**: you meant \`print\`.

Python reads names exactly as written, so one swapped letter makes it look like a brand new variable that was never created.

**Fix:** correct the spelling.

\`\`\`python
pritn("Hello")   # wrong
print("Hello")   # right
\`\`\``,
  },
  {
    id: 'sample-ts-2339',
    title: "Property 'lenght' does not exist on type 'string[]'",
    location: 'src/list.ts:12 · ts(2339)',
    text: `You're asking an array for a property called \`lenght\`, but arrays don't have one. TypeScript caught it **before** your code ran, which is why there's a red squiggle.

The property you want is \`length\` (the "t" and "h" are swapped).

\`\`\`ts
const names: string[] = ["Ada", "Linus"];
console.log(names.length); // 2
\`\`\`

Tip: press **Ctrl+Space** after the dot to see every property that does exist.`,
  },
  {
    id: 'sample-js-undefined-map',
    title: "TypeError: Cannot read properties of undefined (reading 'map')",
    location: 'src/App.jsx:27 · runtime',
    text: `Your code called \`.map()\` on something that was \`undefined\`, meaning it had no value yet.

This usually happens when:

- the data is still loading (e.g. from a \`fetch\`)
- a property name is misspelled, like \`user.posts\` vs \`user.post\`
- a function forgot to \`return\` the list

**Fix:** start with an empty list, or check before mapping.

\`\`\`jsx
const [items, setItems] = useState([]); // start empty, not undefined

{items?.map((item) => <li key={item.id}>{item.name}</li>)}
\`\`\``,
  },
];

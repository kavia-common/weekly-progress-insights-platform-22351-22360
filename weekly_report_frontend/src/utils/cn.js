 // PUBLIC_INTERFACE
 /**
  * cn - Concatenate class names conditionally.
  * Accepts strings, arrays, and objects where truthy values include the key.
  * Example: cn('a', ['b'], { c: true, d: false }) -> 'a b c'
  */
 export function cn(...args) {
   const classes = [];
   for (const arg of args) {
     if (!arg) continue;
     if (typeof arg === 'string') {
       classes.push(arg);
     } else if (Array.isArray(arg)) {
       classes.push(
         arg
           .filter(Boolean)
           .map((item) => (typeof item === 'string' ? item : ''))
           .filter(Boolean)
           .join(' ')
       );
     } else if (typeof arg === 'object') {
       for (const [key, val] of Object.entries(arg)) {
         if (val) classes.push(key);
       }
     }
   }
   return classes.join(' ').trim().replace(/\s+/g, ' ');
 }

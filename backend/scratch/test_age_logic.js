const dob = "2000-08-09T00:00:00.000Z";
let s = String(dob).trim()
  .replace(/[\.\-]/g, '/')
  .replace(/[೦-೯]/g, d => "೦೧೨೩೪೫೬೭೮೯".indexOf(d));

console.log("S:", s);
const parts = s.split('/');
console.log("Parts:", parts);
if (parts.length === 3) {
    console.log("Length is 3");
} else {
    console.log("Length is", parts.length);
    const date = new Date(s);
    console.log("Date:", date);
    console.log("Valid:", !isNaN(date.getTime()));
}

async function testBrowserLike() {
  const url = 'http://localhost:5000/api/tournaments/69bd60c8942ce0bfe5230020';
  const headers = {
    'Origin': 'http://localhost:3000',
    'Accept': 'application/json'
  };

  try {
    const res = await fetch(url, { headers });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Response:", text.substring(0, 500));
  } catch (err) {
    console.error("FETCH ERROR:", err);
  }
}

testBrowserLike();

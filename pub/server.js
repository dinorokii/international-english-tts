import {Hono} from 'hono';
import { serve } from '@hono/node-server'
import { writeFile, appendFile, readFile }  from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));
const app = new Hono();

app.post("/beforewebsite/api/check-word", async(c) => {
  const text = (await c.req.text()).toLowerCase().trim();
  if(!text) throw Error("no text");

  let allowedWords = [];
  try {
    const data = await import('fs/promises').then(fs => fs.readFile('words.txt', 'utf-8'));
    allowedWords = data.split('\n').map(word => word.trim().toLowerCase());
  } catch (err) { 
    console.error(err);
    c.status(500);
    return c.text("Error reading words file");
  }

  for(const word of text.split(" ")) {
    if (word && !allowedWords.includes(word.toLowerCase())) {
      if (word && !allowedWords.includes(word.toLowerCase() + `-1`)) {
        return c.redirect("/beforewebsite/add?word=" + encodeURIComponent(text) );
      }
    }
  }
  return c.text("very good, its all in words.txt");
})

app.post("/beforewebsite/whichword", async (c) => {
  // Read heteronyms.txt from the filesystem, not via fetch
  let heteronyms = [];
  try {
    const data = await import('fs/promises').then(fs => fs.readFile('heteronyms.txt', 'utf-8'));
    heteronyms = data.split('\n').map(word => word.trim().toLowerCase());
  } catch (err) { 
    c.status(500);
    return c.text("Error reading heteronyms file");
  }

  const body = await c.req.parseBody();
  const textData = (body.text_data || '').toLowerCase();

  if (textData.includes(' ')) {
    c.status(400);
    return c.text("Error: There cannot be spaces in the word.");
  }

  const wordsTxtList = (await readFile(join(__dirname, 'words.txt'), 'utf-8')).trim().split("\n");
  if(wordsTxtList.includes(textData.trim())) {
    c.status(400);
    return c.text("Sorgy this word already exists")
  }


  if (textData && !heteronyms.includes(textData)) {
    return c.redirect("/beforewebsite/fun/intonation1?word=" + encodeURIComponent(textData) + "&num=1&vari=0");
  } else {
     return c.html(`<html>
      <head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Eirik Website Eirik</title>
  <link rel="icon" type="image/png" href="/imgs/icon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Magra:wght@400;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="style.css" />
  <style>
    .sidenav {
      height: 100%;
      width: 0;
      position: fixed;
      z-index: 1;
      top: 0;
      left: 0;
      background-color: #111;
      overflow-x: hidden;
      transition: 0.5s;
      padding-top: 60px;
    }

    .sidenav a {
      padding: 8px 8px 8px 32px;
      text-decoration: none;
      font-size: 25px;
      color: #818181;
      display: block;
      transition: 0.3s;
    }

    .sidenav a:hover {
      color: #f1f1f1;
    }

    .sidenav .closebtn {
      position: absolute;
      top: 0;
      right: 25px;
      font-size: 36px;
      margin-left: 50px;
    }

    @media screen and (max-height: 450px) {
      .sidenav {padding-top: 15px;}
      .sidenav a {font-size: 18px;}
    }
  </style>
</head>
      <body>
      <!-- Side navigation -->
<div id="mySidenav" class="sidenav">
  <a href="javascript:void(0)" class="closebtn" onclick="closeNav()">&times;</a>
  <a class="active" href="/">Home</a>
  <a href="/questions">Questions</a>
  <a href="/beforewebsite">IETTS</a>
  <a href="/beforewebsite/whichword">Record</a>
</div>


<!-- Open buttons (outside the sidenav) -->
<span style="font-size:30px;cursor:pointer" onclick="openNav()">&#9776; open</span>


<!-- JavaScript -->
<script>
function openNav() {
  document.getElementById("mySidenav").style.width = "250px";
}

function closeNav() {
  document.getElementById("mySidenav").style.width = "0";
}
</script>

        <h1>The word "${textData}" is a heteronym.</h1>
          <audio controls>
          <source src= "/beforewebsite/whichword/heteronyms/${textData}-1.mp3" type="audio/mpeg">
          </audio>
        <button onclick="location.href='/beforewebsite/fun/intonation1?word=${textData}&num=1&vari=1'">Pronunciation 1</button>
          <audio controls>
          <source src= "/beforewebsite/whichword/heteronyms/${textData}-2.mp3" type="audio/mpeg">
          </audio>
        <button onclick="location.href='/beforewebsite/fun/intonation1?word=${textData}&num=1&vari=2'">Pronunciation 2</button>
      </body>
    </html>`);
  }
});

app.use("/beforewebsite/fun/intonation1", async (c, next) => {
  const num = Number(c.req.query('num'));
  const numMinusOne = num - 1;
  let vari = c.req.query('vari');
  let word = c.req.query('word');

  if(num < 1 || num > 10) return c.text("no");
  
  if (num > 1) {
    let filePath;

    if (vari === undefined || vari === null || vari === "null" || vari === "" || vari === "0") {
      filePath = `audio-files/${word}-${numMinusOne}.wav`;
    } else {
      filePath = `audio-files/${word}-${numMinusOne}-${vari}.wav`;
    }

    try {
      await fs.access(filePath); 
    } catch (err) {
      c.status(400);
      return c.text("You must do all pronunciations.");
    }
  }

  await next();
})

app.post(`/beforewebsite/fun/intonation1`, async (c) => {
  const num = Number(c.req.query('num'));
  const numMinusOne = num - 1;
  let vari = c.req.query('vari');
  const fs = require('fs');
  
  const { audio, word } = await c.req.parseBody();

  if (!(audio instanceof File)) throw Error("Audio is not a file!");
  if (typeof word !== "string") throw Error("Word is not a valid string!");

  if(num < 1 || num > 10) throw Error("Number is out of bounds");

  if (num > 1) {
    let filePath;

    
    if (vari === undefined || vari === null || vari === "null" || vari === "" || vari === "0") {
      filePath = `audio-files/${word}-${numMinusOne}.wav`;
    } else {
      filePath = `audio-files/${word}-${numMinusOne}-${vari}.wav`;
    }

    try {
      await fs.access(filePath); 
      console.log("Good they have done the word before");
    } catch (err) {
      console.log("OH GOD");
      c.status(400);
      return c.text("You must do all pronunciations.");
    }
  }

  const wordsTxtList = (await readFile(join(__dirname, 'words.txt'), 'utf-8')).trim().split("\n");
  if(wordsTxtList.includes(word.trim())) {
    c.status(400);
    return c.text("Sorgy this word already exists")
  }

  if (num === 10) {
    if (vari === undefined || vari === null || vari === "null" || vari === "" || vari === "0") {
    try {
      await appendFile('words.txt', word + '\n');
    } catch {
      c.status(500);
      return c.text("Error saving file");
    }
  } else { 
      try {
      await appendFile('words.txt', word + "-" + `${vari}` + '\n');
    } catch {
      c.status(500);
      return c.text("Error saving file");
    }
  }
}
if (num === 10) {
  let data = fs.readFileSync('beforewebsite/grabs.txt', 'utf-8');
  let yeah = `${word}`;
   const grabwords = (await readFile(join(__dirname, 'beforewebsite/grabs.txt'), 'utf-8')).trim().split("\n");
  if(grabwords.includes(word.trim())) {
   let newValue = data.replace(new RegEx(yeah), '');
   await writeFile ('beforewebsite/grabs.txt', newValue, 'utf-8');
}

  if (vari === undefined || vari === null || vari === "null" || vari === "" || vari === "0") {
    await writeFile(`audio-files/${word}-${num}.wav`, Buffer.from(await audio.arrayBuffer()));
    return c.json({ message: "The file was saved" });
  } else {
    await writeFile(`audio-files/${word}-${num}-${vari}.wav`, Buffer.from(await audio.arrayBuffer()));
    return c.json({ message: "The file was saved" });
  }
}
});

app.post("/beforewebsite/stats/api/whatever", async (c) => {
  const filePath = join(__dirname, 'words.txt'); 
  const fileContent = await readFile(filePath, 'utf-8');

  async function getLastWord() {
    try {
      const lines = fileContent.split('\n');
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].trim() !== '') {
          return lines[i];
        }
      }
      return '';
    } catch (error) {
      console.error("Error reading or processing the file:", error);
      return null;
    }
  }

  const lastWord = await getLastWord();


  if (lastWord !== null) {
    return c.json({
      lastWord: lastWord,
      percentHeteronymsFinished: (fileContent.trim().split("\n").filter((word)=> word.includes("-")).length / 152 * 100).toFixed(2) + "%",
      wordsCount: fileContent.trim().split("\n").length
    }); 
  } else {
    c.status(500);
    return c.text("Error reading file");
  }
});

app.post("/beforewebsite/add", async (c) => {
  const body = await c.req.parseBody();
  let word = body.word;
  try {
      await appendFile('beforewebsite/grabs.txt', word + '\n');
      return c.redirect("/beforewebsite")
    } catch {
      c.status(500);
      return c.text("Error saving file");
    }
});

import { serveStatic } from '@hono/node-server/serve-static';
app.use("/*", serveStatic({ root: "./" }));

app.use('/', serveStatic({ path: './index.html' }))

serve({
  fetch: app.fetch,
  port: 33051,
})

export const ARTICLES: Record<string, string> = {
  'time-zone-converter': `
<h2>How to convert a time</h2>
<p>Pick the wall-clock date and time, then choose the zone that clock belongs to and the zone you want to read. The result is the same instant, printed in the destination zone with its short abbreviation. A meeting at 16:00 in Asia/Kolkata is 10:30 in UTC, because India is five hours and thirty minutes ahead of UTC and does not observe daylight saving. The same 16:00 in America/New_York is a different UTC instant in January than it is in July.</p>
<p>Use an IANA name such as America/Los_Angeles or Europe/London. Abbreviations like IST, PST, and CST are ambiguous: IST can mean India, Israel, or Ireland, and CST is used in both North America and China. If the zone you need is not in the short list, type its IANA name in the extra field. The browser already ships the zone database through the Intl API, so this page does not download a timezone file and it does not ask a server what time it is.</p>
<p>Open “This instant in other zones” after a conversion when you are lining up a call. The table shows one instant in each listed zone. Share the UTC time when the group spans several regions, then let each person read that instant in their own zone.</p>
<h2>Daylight saving, gaps, and overlaps</h2>
<p>Some zones skip an hour in spring and repeat an hour in autumn. A local time that falls in the spring gap does not exist. The converter tells you so instead of silently picking a neighboring hour. A local time in the autumn overlap happens twice. The result uses the earlier instant and lists the later one as well, so you can see both offsets. UTC itself never shifts. Asia/Kolkata does not either. America/New_York, America/Chicago, America/Denver, America/Los_Angeles, and Europe/London do.</p>
<p>The fields of a cron schedule are also wall-clock fields. If you are explaining a schedule on the <a href="/tools/cron-explainer/">cron expression explainer</a>, choose the zone the server uses, which is often UTC, and read the next runs there. A clock time with no zone is not an instant. This page’s job is to attach the zone and produce the instant.</p>
<h2>Common questions</h2>
<h3>Why is there no separate page for IST to PST?</h3>
<p>One converter covers every pair. Choose Asia/Kolkata as the source and America/Los_Angeles as the destination. PST is the winter abbreviation for that zone; in summer the same zone is PDT, one hour further from UTC. Naming the IANA zone keeps the answer right on both sides of the change.</p>
<h3>Does the page know about future rule changes?</h3>
<p>It uses the time zone data in your browser. When governments change daylight-saving rules, browsers ship the update in a later release. The page does not keep a private copy of the database that could go stale on its own.</p>
<h3>What if I only know the offset, such as UTC+5:30?</h3>
<p>A fixed offset is not a zone. UTC+5:30 matches Asia/Kolkata today, and it also matches other regions that do not share India’s history. Prefer the city or region name. Use UTC when you truly mean a zero offset with no daylight saving.</p>
<h3>Is the time I type sent anywhere?</h3>
<p>No. Formatting is done with Intl.DateTimeFormat in the page you already loaded. The date never leaves the browser, and the page does not call a time service.</p>
`,
  'image-compressor': `
<h2>How to compress an image</h2>
<p>Choose one or more JPEG, PNG, WebP, or HEIC files. Pick an output format, a quality, and the longest side in pixels. The page decodes the file, draws it to a canvas at the chosen size, and encodes a new file for you to download. The original stays where it was. The download is a new blob created in memory.</p>
<p>JPEG and WebP are lossy. A quality around 80 keeps most photographs looking clean and cuts the file a lot. Lower it when the picture is a thumbnail or a social preview. PNG is lossless, so the quality slider does not apply. A photograph saved as PNG often gets larger. Use PNG when the image is a diagram, a screenshot with flat color, or anything that must not pick up compression blocks.</p>
<p>The longest-side control is how you resize. A 4000 pixel phone photo limited to 1920 pixels on the long edge is enough for a blog post and much smaller to ship. Leave the size at “Original” when you only want a lighter encoding. Canvas dimensions are rounded to whole pixels, and the aspect ratio is kept.</p>
<h2>HEIC to JPG</h2>
<p>Photos from recent iPhones are often HEIC. Many desktop browsers cannot decode that format with the built-in image decoder. When the file type or the .heic or .heif name says it is HEIC, this page loads a local libheif decoder and turns the first picture into pixels, then encodes the JPEG, WebP, or PNG you asked for. That decoder is a WebAssembly build packaged inside a script from this site. It is downloaded only when you open a HEIC file. A JPEG or PNG never triggers it. The photo bytes are passed to that local decoder. They are not posted to an upload API.</p>
<p>Re-encoding drops the metadata the canvas does not keep, including a typical location tag. That is useful when you do not want a photo’s GPS data in the file you publish. If you needed the original metadata, keep the original file.</p>
<h2>Common questions</h2>
<h3>Why did the file get bigger?</h3>
<p>PNG and a high WebP or JPEG quality can exceed a file that was already compressed. Try JPEG or WebP at a lower quality, or shrink the long edge. Screenshots with large flat areas still prefer PNG.</p>
<h3>Will this work offline?</h3>
<p>After the page script is loaded, JPEG, PNG, and WebP stay on the device. The first HEIC file in a session also needs the decoder chunk from this site. Later HEIC files in that session reuse it. Nothing about the picture is uploaded either way.</p>
<h3>Can I convert a whole album?</h3>
<p>Select several files. They are processed one after another so a large photo does not have to share the canvas with the next one. There is a 25 MB cap per file so a single huge image does not freeze the tab.</p>
<h3>Which format should I publish?</h3>
<p>WebP or JPEG for photographs, PNG for graphics with sharp edges and text. HEIC is a fine camera format and a poor format to hand to visitors, because support is uneven. Convert it to JPEG when the audience is a normal web page.</p>
`,
  'json-formatter': `
<h2>How to format and validate JSON</h2>
<p>Paste JSON into the box and choose Format. The page parses it with JSON.parse and prints it again with a two-space or four-space indent. Minify removes the insignificant whitespace so the text is a single line, which is what you want in a log field or a query parameter. Validate parses the text and stops there, so you can check a payload without rewriting it.</p>
<p>When the text is not JSON, the message includes the line and column when the engine reports them. The usual mistakes are a trailing comma, a single-quoted string, a comment, or an unquoted key. JSON does not allow any of those. This page does not silently accept JSON5. If a config file has comments, remove them before you call it JSON.</p>
<p>Pretty printing does not sort keys and it does not drop unknown fields. The value you get back is the value that was parsed. Numbers that JSON can represent stay numbers. Very large integers can lose precision because JSON numbers are IEEE-754 doubles. If an identifier must stay exact, keep it in a string in the source.</p>
<h2>YAML, CSV, and a diff</h2>
<p>JSON to YAML and YAML to JSON use a JSON-compatible YAML schema, so the conversion stays close to JSON’s types. Dates and custom tags are not the point of this tool. CSV export accepts an array of objects, an array of arrays, or a single object written as key and value columns. CSV import treats the first row as column names and rejects a repeated name. Fields that contain commas, quotes, or line breaks are quoted.</p>
<p>The diff compares two JSON values by structure. Added keys, removed keys, and changed values are listed with a path. Arrays are compared by index, not as a bag of items, so inserting a row shifts every later index. That is the predictable reading for an API payload. The list stops after 200 changes so a huge document cannot lock the tab.</p>
<p>People paste tokens, customer records, and production config into online formatters. Those sites receive the text. This one parses it in the browser. Use the <a href="/tools/jwt-decoder/">JWT decoder</a> when the text is a token, and the <a href="/tools/regex-tester/">regex tester</a> when you are extracting a field rather than parsing a document.</p>
<h2>Common questions</h2>
<h3>Does formatting fix invalid JSON?</h3>
<p>No. Format and minify both require a successful parse. Fix the syntax, then format. The validator is the same parser, so a file that validates will format.</p>
<h3>Why did a number change?</h3>
<p>JSON has one number type. Integers larger than 2^53−1 are not exact in JavaScript. Put those values in strings if the digits themselves matter.</p>
<h3>Can I convert YAML that uses anchors?</h3>
<p>The converter is aimed at JSON-shaped documents. Exotic YAML features are outside what a JSON round trip can keep. If the YAML is a normal map or list of scalars, it converts.</p>
<h3>Is the text stored?</h3>
<p>No. There is no request with your document in it. Closing the tab drops the text with the page.</p>
`,
  'word-counter': `
<h2>How the counts work</h2>
<p>Type or paste in the box. The counts update as you type. A word is a stretch of text separated by whitespace, which is how a document counter treats “it’s” and “state-of-the-art” as single words. Characters are Unicode code points, so a single emoji counts as one character here. Some form fields instead count UTF-16 code units, and an emoji can take two of those. If you are up against a hard maxlength in an old form, leave a little room.</p>
<p>Characters without spaces drop every whitespace code point and keep the rest, including punctuation. Sentences are split on periods, question marks, and exclamation marks, and a piece counts only when it still contains a letter or a number. “Dr.” will look like a sentence break. That is a simple split, not a grammar parser, and it is good enough for a draft. Paragraphs are blocks separated by a blank line. A single newline does not start a new paragraph. Lines follow the newline characters you actually typed.</p>
<p>Reading time divides the word count by 230. That is the same pace this site uses when it estimates how long a post takes to read. It is a planning number, not a measurement of you. A page of code or a page of names will not match it.</p>
<h2>Length limits that show up in publishing</h2>
<p>The bars under the box compare the character count with limits people bump into: about 60 characters for a search title, about 160 for a meta description, 280 for an X post, 300 for Bluesky, and 3000 for a LinkedIn post. These are the usual published ceilings, not a live reading of each product’s current counter. X in particular weights some characters and counts some links in its own way. Use the bar to see that you are in range, then check the product if the post is close to the edge.</p>
<p>For a meta description, write the sentence first and look at the character line, not the word line. Search snippets are cut by width, and width follows characters. The <a href="/tools/regex-tester/">regex tester</a> is the next stop when you want to strip markup or pull a title out of a larger blob before you count it.</p>
<h2>Common questions</h2>
<h3>Does it count words inside HTML tags?</h3>
<p>Yes, if the tags are in the box. The counter does not parse HTML. Paste the visible sentence when you want the words a reader sees. Paste the raw source when you want the length of the source.</p>
<h3>Why is the character count different from my phone?</h3>
<p>Products disagree about emoji, newlines, and links. This page counts code points and counts a newline as a character. A social app may collapse a link to a fixed length. The figure here is the length of the text you pasted.</p>
<h3>Can I count several drafts?</h3>
<p>Replace the text. Nothing is saved between visits, which also means a draft you meant to keep should live in your own notes. The page is a counter, not a document editor.</p>
<h3>What is a good meta description length?</h3>
<p>Aim for a complete sentence under about 160 characters. Shorter is fine when the sentence is done. Stuffing keywords past the point where the sentence reads well does not help the snippet.</p>
`,
  'age-calculator': `
<h2>How to read the result</h2>
<p>Enter a date of birth and an as-of date. The result is a calendar age: full years, then full months, then the leftover days. It is the same idea as saying someone is 19 years, 11 months, and 30 days old, rather than a decimal like 19.97. Total days and whole weeks are there when you need a single number. The weekday is the weekday of the birth date in the Gregorian calendar.</p>
<p>The as-of date defaults to today after the page loads, and you can set another day. That is how you answer “how old will this person be on a given date?” Age is computed from the two calendar dates. It does not use a clock or a time zone. A birthday is a date, not an instant. If you are scheduling the celebration across regions, convert the clock time separately with the <a href="/tools/time-zone-converter/">time zone converter</a>.</p>
<h2>Months, leap days, and the next birthday</h2>
<p>Months have different lengths, so “one month after 31 January” is not a single obvious day. This calculator moves the birth day forward and clamps it to the last real day of the destination month. One month after 31 January 2000 is 29 February 2000, because 2000 was a leap year. One month after 31 January 2001 is 28 February 2001. The age from 31 January 2000 to 1 March 2000 is one month and one day.</p>
<p>A birthday on 29 February is observed on 28 February in a non-leap year. From 29 February 2000 to 28 February 2001 the age is one year exactly. The next birthday uses that same rule. On the birthday itself, the days-until line is zero. The day after, the next birthday is in the following year.</p>
<p>The calculator rejects a date that is not a real calendar day, such as 31 February, and it rejects an as-of date before the birth date. It is a date tool for ordinary planning. It is not legal, medical, or benefits advice. Those contexts sometimes define age with their own statutes, including special leap-day rules.</p>
<h2>Common questions</h2>
<h3>Why not a decimal age?</h3>
<p>Years are not the same length, and a decimal hides the month and day. The year-month-day form matches how people answer “how old?” The total number of days is exact if you need to divide it yourself.</p>
<h3>Which time zone is the birthday in?</h3>
<p>Neither. Both inputs are calendar dates. The moment a local clock passes midnight differs by zone, and this page does not try to guess the hospital’s zone. Pick the calendar date you mean.</p>
<h3>What about dates before the Gregorian reform?</h3>
<p>The math uses the proleptic Gregorian calendar that JavaScript’s UTC date functions use. Historical calendars and political cutovers are not modeled. For modern birth dates the result matches a normal calendar.</p>
<h3>Is the date uploaded?</h3>
<p>No. The subtraction runs in the page. The dates are not sent to an API and they are not written to an account, because there is no account.</p>
`,
  'qr-code': `
<h2>How to make a code</h2>
<p>Choose what the code should contain: plain text, a URL, a Wi-Fi network, or a vCard contact. Fill in the fields and generate. The page builds the payload, draws a black-on-white code, and lets you download a PNG or an SVG. Error correction can be low, medium, quartile, or high. Medium is a good default. Use a higher level when the code will be printed small or might be scratched. Higher correction makes a denser symbol.</p>
<p>The symbol is static. Every character of the payload is in the image. Scanning it does not ask this website for a redirect, and the code does not expire when a subscription lapses, because there is no subscription and no stored code. If you later need the link to change, make a new code. A dynamic code that can be edited later is a different product: it encodes a short link and looks the destination up on a server. This page does not do that.</p>
<h2>Wi-Fi, vCard, and URLs</h2>
<p>The Wi-Fi payload follows the usual WIFI: form. The network name and password are escaped so that a semicolon or a backslash in the password does not break the fields. WPA covers the common home networks that use WPA2 or WPA3. Choose “no password” for an open network. Hidden networks set the hidden flag. Anyone who can see or photograph the code can join the network, because the password is inside the image. Do not publish a code for a network whose password you would not hand to the people in the room.</p>
<p>The vCard is version 3.0. Empty optional lines are left out. A phone number is included only if you type one. The page does not invent contact details. A URL is encoded as you type it, so include https:// when you want a web address. You can paste a link that already has UTM parameters. The <a href="/tools/image-compressor/">image compressor</a> can shrink the PNG afterward if you need a smaller file for a page.</p>
<p>Keep a quiet margin around the symbol when you place it in a design. The generator adds a small quiet zone. Stretching the code, or putting it on a patterned background, makes it harder to scan. The preview stays black modules on white even in dark mode, because scanners expect that contrast.</p>
<h2>Common questions</h2>
<h3>Will the code stop working?</h3>
<p>The image will keep encoding the same text. A URL inside it still depends on that URL. If the page you linked is taken down, the code scans and the browser then fails, which is the website’s problem, not the symbol’s.</p>
<h3>Can I change the destination later?</h3>
<p>No. Generate a new image. That is the trade for a code that does not rely on a server to remember your link.</p>
<h3>How much text fits?</h3>
<p>QR capacity depends on the version, the character set, and the error correction. A normal URL or Wi-Fi password fits easily. A very long note may fail to encode. Shorten it or lower the error correction and try again.</p>
<h3>Is the Wi-Fi password uploaded?</h3>
<p>No. The payload is built in the browser and drawn to a canvas. Do not email the image to people who should not know the password. The secrecy is in who can see the picture.</p>
`,
  'percentage-calculator': `
<h2>The percentage tab</h2>
<p>Three calculations sit on the first tab. “What is X% of Y?” multiplies the percentage by the total and divides by 100. Eight percent of 250 is 20. “X is what percent of Y?” divides the part by the whole and multiplies by 100. The whole cannot be zero, because there is no percentage of nothing. “Percent change” is (new − old) / old × 100. From 80 to 100 is an increase of 25%. From 100 to 80 is a decrease of 20%. Those two are different because the base changed. A drop of 20 percentage points is not the same sentence as a drop of 20 percent, and this calculator always means the ratio, not a subtraction of two percentages.</p>
<p>Negative bases follow the same formula. The sign comes from the arithmetic, so read it with the numbers in front of you. Empty fields stay quiet. A result appears when both numbers are filled in. The <a href="/tools/unit-converter/">unit converter</a> is the better tool when the question is about bytes or milliseconds rather than a ratio.</p>
<h2>The percentile tab</h2>
<p>A percentile says where a value sits in a sorted list. The 90th percentile is not “90 percent of the first number.” Switch to the Percentile tab, paste the observations separated by commas, spaces, or newlines, and choose the percentile and the method.</p>
<p>Inclusive interpolation matches the common spreadsheet function PERCENTILE.INC. The rank is (p / 100) × (n − 1) on the sorted list, and the result blends the two nearest values. Zero returns the minimum and 100 returns the maximum. Exclusive interpolation matches PERCENTILE.EXC. It uses (p / 100) × (n + 1) and refuses the endpoints and any rank that falls outside the sample. A short list cannot support an extreme exclusive percentile, and the page says so. Nearest rank takes the smallest index whose cumulative share reaches the requested percentile, using ceil(p / 100 × n), and it returns the minimum at zero.</p>
<p>With the five numbers 1, 2, 3, 4, and 5, the inclusive 25th percentile is 2, the inclusive median is 3, and the exclusive 20th percentile is 1.2. Say which method you used when you quote the number. Small samples move a lot when you add one observation. A percentile from a handful of scores is a description of that handful, not a property of a larger population.</p>
<h2>Common questions</h2>
<h3>Which percentile method should I use?</h3>
<p>Use inclusive when you want the same answer as a typical spreadsheet, including the minimum and the maximum. Use exclusive when you are matching PERCENTILE.EXC. Use nearest rank when you want an actual observation from the list rather than a blend of two.</p>
<h3>Why did percent change and “percentage points” disagree?</h3>
<p>Percentage points are a subtraction: 30% minus 25% is 5 percentage points. Percent change divides by the starting value. This page computes percent change. Name the unit when you write the sentence.</p>
<h3>Can I paste a column from a spreadsheet?</h3>
<p>Yes. Commas, spaces, semicolons, and line breaks are all separators. A token that is not a number is reported so a stray word does not become a zero.</p>
<h3>Are the numbers uploaded?</h3>
<p>No. Both tabs run in the page. A list of scores or salaries stays in the browser.</p>
`,
  'jwt-decoder': `
<h2>How to read a token</h2>
<p>Paste a JSON Web Token. It looks like three segments of base64url separated by dots. The page decodes the first segment as the header and the second as the payload, then pretty-prints both as JSON. A leading “Bearer ” is ignored so you can paste an Authorization header value. If the header has an alg claim, it is shown above the JSON. exp, nbf, and iat are printed as UTC timestamps when they are numbers, and the page says whether exp is already in the past relative to your clock.</p>
<p>The third segment is the signature. It is shown as the original base64url text. It is not checked. Checking a signature needs the secret or the public key, a decision about which algorithms you trust, and a rejection of alg values you did not expect. A decoder that pretended to “verify” without a key would be misleading. Do not treat a successful decode as proof that a caller is signed in. Verification belongs in the service that holds the key.</p>
<h2>What you can learn from an unverified payload</h2>
<p>You can still learn a lot. The header tells you the algorithm the issuer claimed. The payload tells you the subject, the audience, the expiry, and any custom claims. That is enough to debug a client that is sending the wrong token, to see that a token expired an hour ago, or to confirm that a scope claim is missing. It is not enough to grant access.</p>
<p>Tokens are credentials. Pasting one into a website that uploads the field gives that website the credential. This page decodes in the browser and does not have a backend to receive it. Even so, treat a production access token as a secret: prefer a short-lived token, and avoid leaving it on a shared screen. The <a href="/tools/json-formatter/">JSON formatter</a> is the right place when you already have the payload as JSON and only want it indented. The <a href="/tools/password-generator/">hash generator</a> is unrelated to JWT signatures. A SHA-256 of the token text is not a verification.</p>
<h2>Common questions</h2>
<h3>Why did decode succeed on a token I forged?</h3>
<p>Because anyone can base64url-encode a JSON object and put a dot after it. The signature is what would have caught that, and this tool does not check it. A forged payload still “decodes.”</p>
<h3>What about the none algorithm?</h3>
<p>If the header says alg is none, or the signature segment is empty, the page still prints the JSON. It does not special-case that token into a trusted state. Services should reject unexpected algorithms. The label on this page stays “not verified.”</p>
<h3>The payload is not JSON. What happened?</h3>
<p>A JWT header and payload are JSON. If the segment decodes to an array, a string, or garbage, the page reports that. Encrypted JWEs are a different shape and are not decrypted here.</p>
<h3>Does the expiry check contact a time server?</h3>
<p>No. It compares the exp claim with the clock in your own computer. If that clock is wrong, the “expired” line is wrong by the same amount.</p>
`,
  'cron-explainer': `
<h2>How to read an expression</h2>
<p>A standard cron expression has five fields: minute, hour, day of month, month, and day of week. This page also accepts a leading seconds field, which makes six fields, and an optional year at the end. Type the expression or start from a preset. The summary is a sentence, the table restates each field, and the list below is the next run times in the zone you pick. The zone matters because the fields are wall-clock fields. A job at 09:30 in UTC is not 09:30 in Asia/Kolkata. Use the <a href="/tools/time-zone-converter/">time zone converter</a> when you need to present that instant to someone in another region.</p>
<p>Stars mean every value. A step such as */15 in the minute field means 0, 15, 30, and 45. Ranges and lists work, and month and weekday names are accepted. 0 and 7 both mean Sunday, and 1 means Monday, which is the usual cron numbering. Quartz’s question mark is read as “no specific value,” the same as a star for matching. The shortcuts @hourly, @daily, @weekly, @monthly, and @yearly expand to the familiar five-field forms.</p>
<h2>Days, and what this page does not claim</h2>
<p>When both the day-of-month and the day-of-week are restricted, a date matches if either field matches. That is the traditional cron rule. When one of them is a star or a question mark, only the other field restricts the day. So 30 9 * * 1-5 is 09:30 on Monday through Friday, and 0 0 1 * * is midnight on the first of every month.</p>
<p>The letters L and W, and the # nth-weekday syntax used by some Quartz calendars, are rejected with a message. Those forms are easy to misread and they differ between schedulers. If your expression uses them, this page will say so instead of guessing. Next-run times walk the civil clock in the selected zone and skip a wall time that does not exist because of a daylight-saving gap. An overlap can produce two instants for one civil minute.</p>
<p>The list is a forecast from the rules above, not a promise from your production scheduler. Containers, systemd timers, and cloud schedulers add their own timezone settings and their own definitions of “the next minute.” Read the summary, then confirm the next run against the system that will actually fire.</p>
<h2>Common questions</h2>
<h3>Why did my job not run at the time in the list?</h3>
<p>The server may be using UTC while you read the expression as local time, or the scheduler may be Quartz with a different weekday numbering when you used a digit instead of a name. Names such as MON avoid that particular trap. Also check that the process is running and that a previous run is not still holding a lock.</p>
<h3>Is Sunday 0 or 1?</h3>
<p>Here, Sunday is 0, and 7 is accepted as Sunday too. Monday is 1. Some Quartz defaults number Sunday as 1. Prefer MON, TUE, and the other names when you copy an expression between systems.</p>
<h3>What does @daily expand to?</h3>
<p>It expands to 0 0 * * *, which is 00:00 every day in the zone you selected. @hourly is minute 0 of every hour.</p>
<h3>Are expressions uploaded?</h3>
<p>No. Parsing and the next-run walk happen in the browser. A schedule is rarely secret, but the same rule applies as for the other tools: the text stays on the device.</p>
`,
  'regex-tester': `
<h2>How to test a pattern</h2>
<p>Enter a JavaScript regular expression without the surrounding slashes, choose flags, and paste the text to search. Find matches lists every match, the index where it starts, and the capture groups. Numbered groups are 1, 2, 3, and named groups use the name you wrote in the pattern. Replace applies the replacement string with the flags you selected. Include g when you want every match replaced. Without g, JavaScript replaces the first match only, and this page does the same.</p>
<p>The engine is the one in your browser, which is the same family you get from new RegExp in application code. A pattern that works in Python, PCRE, or a Java Matcher can still fail here, or succeed with a different group. Lookahead and lookbehind are available in current browsers. Possessive quantifiers and some Unicode property escapes differ. When you are debugging a production service, match the language of that service. Use this page for JavaScript, including the scripts and the JSON you clean up before the <a href="/tools/json-formatter/">JSON formatter</a>.</p>
<h2>Flags, empty matches, and runaway patterns</h2>
<p>i ignores case. m makes ^ and $ match around line breaks. s lets a dot match a newline. u turns on Unicode mode, which you want when the pattern uses the u flag’s stricter escapes. The sticky flag y is refused, because a tester that moves lastIndex by hand is easier to misread than it is to learn. An empty match, such as a* against an empty spot, advances one character so the search cannot spin in place.</p>
<p>Some patterns take exponential time. A classic is a pile of nested quantifiers against a long string that almost matches. The search runs in a worker and is stopped after about a second. You get an error instead of a frozen tab. That limit is a safety rail, not a proof that the pattern is fast enough for a hot loop. Shorten the sample and simplify the pattern. The <a href="/tools/word-counter/">word counter</a> is the simpler tool when you only needed a length.</p>
<h2>Common questions</h2>
<h3>Why did the slash in my pattern break?</h3>
<p>Do not include the / delimiters. If the pattern itself contains a slash, write it as a normal character. There is no need to escape it for this box, because the box is not a slash-delimited literal.</p>
<h3>Where are the global indexes?</h3>
<p>Each row shows the start index in the text. The match value is the full match, group 0. Groups that did not participate are omitted rather than shown as empty, so you can see which alternative actually fired.</p>
<h3>Can I test a pattern against a whole file?</h3>
<p>Keep the sample under 20,000 characters. A tester that accepts a multi-megabyte log on the main thread is how pages lock up. Cut the sample down to the lines that matter.</p>
<h3>Is the pattern sent to a regex service?</h3>
<p>No. The worker is a local script. The pattern and the text are posted to that worker in the same browser, not to a network endpoint.</p>
`,
  'password-generator': `
<h2>Passwords</h2>
<p>Choose a length from 8 to 128 and the sets you want: lowercase, uppercase, digits, and symbols. The generator draws from the Web Crypto random source, not from Math.random. Each index is taken with rejection sampling so the leftover at the end of the 32-bit range does not bias the alphabet. When the length allows it, the password includes at least one character from every set you turned on, and the characters are shuffled afterward. “Avoid ambiguous characters” drops 0, O, o, 1, l, and I, which helps when someone has to type the password off a screen.</p>
<p>A longer password from a full alphabet beats a short password with a clever substitution. Eight characters is the floor this form allows, and it is short for anything an attacker can guess offline. Use a length you can store in a password manager. This page does not store the password, does not have an account, and does not transmit it. Copy it and put it in your manager. Closing the tab drops it.</p>
<h2>UUID and hash</h2>
<p>UUID v4 is random, with the version and variant bits set the way RFC 9562 requires. UUID v7 puts a 48-bit millisecond timestamp in front and fills the rest with random bits, so identifiers sort roughly by creation time. Neither version includes your name or your machine’s MAC address. They are identifiers, not secrets. Do not use a UUID as a password.</p>
<p>The hash box computes SHA-256, SHA-384, or SHA-512 of the text you type, as hexadecimal. The same text always produces the same hash. That is useful for a checksum. It is a poor way to store a password, because these hashes are fast and unsalted. Password storage wants a slow function such as bcrypt, scrypt, or Argon2, with a salt. bcrypt’s cost is an exponent: cost 12 means 2^12 rounds of the expensive step, and each extra point doubles the work. This page explains that and does not emit a bcrypt hash. Hashing a password with SHA-256 here will not produce a string you should put in a user table.</p>
<p>If you are decoding a credential rather than creating one, use the <a href="/tools/jwt-decoder/">JWT decoder</a>. It will show you the claims and it will also refuse to pretend the signature was checked.</p>
<h2>Common questions</h2>
<h3>Can you show me the password later?</h3>
<p>No. It was generated on your device and it was not saved. Generate another one. If you already stored the first in a manager, you do not need this page to remember it.</p>
<h3>Is UUID v7 safer than v4?</h3>
<p>They solve different problems. v4 is unstructured randomness. v7 leaks the creation time to anyone who can see the identifier, and in return it indexes nicely. Pick v7 when you want sort order. Pick v4 when you do not want the time embedded.</p>
<h3>Why will you not reverse a hash?</h3>
<p>A cryptographic hash is not encryption. Many texts can share no short inverse, and this page does not search for one. If you hashed the wrong text, hash the right text.</p>
<h3>Which symbol set is this?</h3>
<p>A short ASCII set that is unlikely to be eaten by a shell quote: punctuation such as !@#$%^&amp;* and a few brackets. If a site rejects a symbol, turn symbols off or generate again. The entropy is in the length and the size of the set, not in one particular character.</p>
`,
  'unit-converter': `
<h2>Data size</h2>
<p>Decimal prefixes and binary prefixes are different units, and mixing them is how a “1 TB” disk looks smaller in an operating system that reports tebibytes. In this converter a kilobyte (kB) is 1000 bytes, a megabyte is 1000 squared, and so on. A kibibyte (KiB) is 1024 bytes, a mebibyte is 1024 squared, and a gibibyte is 1024 cubed. The labels on the menu spell that out so the unit you pick is the unit you meant. Bits are there too: a byte is eight bits. Networking people quote megabits per second, and file sizes are usually bytes, so the factor of eight is the whole argument.</p>
<p>The <a href="/tools/percentage-calculator/">percentage calculator</a> is the companion when you want “this file is what percent of the disk?” after you have both numbers in the same unit. Convert first, then take the ratio. Doing the ratio on mixed MB and MiB values is how the percent comes out slightly wrong.</p>
<h2>Throughput, latency, and transfer time</h2>
<p>Throughput units convert to bits per second. Mbit/s uses decimal millions of bits. MB/s on this page means a million bytes per second, and MiB/s means 1024 squared bytes per second. A link advertised as 100 Mbit/s moves 12.5 MB of payload per second only in the ideal case where every bit is payload. Real transfers spend some of the link on protocol overhead, so treat the transfer estimate as a ceiling, not a benchmark.</p>
<p>The transfer section asks for a size and a rate and returns a duration. Pick the size unit and the rate unit independently. Latency units run from nanoseconds to hours. They are a straight conversion: a millisecond is a thousandth of a second. They do not model a network. A round trip is something you measure. The converter only keeps the units honest when you write the number down.</p>
<p>The <a href="/tools/time-zone-converter/">time zone converter</a> answers a different “time” question: what clock reads the same instant somewhere else. Latency and transfer duration are lengths of time, not clock times, so they live here.</p>
<h2>Common questions</h2>
<h3>Is 1 KB 1000 or 1024?</h3>
<p>On this page, kB is 1000 and KiB is 1024. Marketing copy and some operating systems still say KB for 1024. When the distinction matters, use the explicit unit. When someone says “about a meg” for a casual file size, the 2.4% gap between MB and MiB is rarely the real problem.</p>
<h3>Why is my download slower than the estimate?</h3>
<p>The estimate is size times eight, divided by the bit rate you typed. It ignores TCP, TLS, packet headers, disk speed, and a rate limit. It answers the unit question. It does not speed-test your connection.</p>
<h3>Can I convert miles or Celsius?</h3>
<p>No. The converter is the set of units that show up next to system design: bytes, bit rates, and latencies. Everyday unit conversion is a different product, and a search box already answers most of those queries.</p>
<h3>Are the numbers uploaded?</h3>
<p>No. Multiplication and division run in the browser. A file size is rarely sensitive, and it still stays on the device.</p>
`,
};

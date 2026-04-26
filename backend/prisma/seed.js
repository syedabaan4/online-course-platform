/**
 * Dev seed: clears all app data and inserts demo users, courses, lectures
 * (YouTube URLs — player uses iframe embed), published quizzes, and resources.
 *
 * Run from backend/:  npx prisma db seed
 * Requires DATABASE_URL in .env (see README).
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../src/prisma');

const DEMO_PASSWORD = 'pass123';

/**
 * Real YouTube watch URLs (frontend detects youtube.com / youtu.be and embeds).
 * Mix of established educational channels; IDs are long-lived public videos.
 */
const YT = {
	html12min: 'https://www.youtube.com/watch?v=UB1O30WRT0w',
	html5doc: 'https://www.youtube.com/watch?v=Wm6CUkswsNw',
	cssCrash: 'https://www.youtube.com/watch?v=yfoY53QXEnI',
	cssWds: 'https://www.youtube.com/watch?v=1PnVor36_40',
	flexbox: 'https://www.youtube.com/watch?v=JJSoEo8JSnc',
	cssGrid: 'https://www.youtube.com/watch?v=jV8B24rSN5o',
	jsCrash: 'https://www.youtube.com/watch?v=hdI2bqOjy3c',
	jsDom: 'https://www.youtube.com/watch?v=y17RuWkWdn8',
	jsAsync: 'https://www.youtube.com/watch?v=V_Kr9OSfDeU',
	httpCrash: 'https://www.youtube.com/watch?v=iYM2zFP3Zn0',
	internetHow: 'https://www.youtube.com/watch?v=7_LPdTHKjWo',
	sqlFull: 'https://www.youtube.com/watch?v=HXV3zeQGqFc',
	sqlJoins: 'https://www.youtube.com/watch?v=9yeOJ0ZMUYw',
	dataViz: 'https://www.youtube.com/watch?v=g530cnFfkQI',
	uxLaws: 'https://www.youtube.com/watch?v=RTjZWjN0gYw',
	uxNng: 'https://www.youtube.com/watch?v=9Bzj3ZLkGDc',
	figmaUi: 'https://www.youtube.com/watch?v=HZuk6Wkx_Eg',
	designThinking: 'https://www.youtube.com/watch?v=6ulX6XLr3v4',
	bizEmail: 'https://www.youtube.com/watch?v=MNeXOozFRKw',
	presentations: 'https://www.youtube.com/watch?v=Unzc731iCUY',
	meetings: 'https://www.youtube.com/watch?v=Y5FaKje_0rs',
	dataStory: 'https://www.youtube.com/watch?v=IIM1Xw3XY_M',
	metrics101: 'https://www.youtube.com/watch?v=grSTWlLrSlE',
	biasData: 'https://www.youtube.com/watch?v=OjrGu0L9KZE',
};

const SAMPLE_PDF =
	'https://www.w3.org/WAI/WCAG21/working-examples/pdf-img/speech-bubble.pdf';

async function clearAll() {
	await prisma.quizAttemptAnswer.deleteMany();
	await prisma.quizAttempt.deleteMany();
	await prisma.lectureProgress.deleteMany();
	await prisma.certificate.deleteMany();
	await prisma.enrollment.deleteMany();
	await prisma.course.deleteMany();
	await prisma.user.deleteMany();
}

/** @param {string} questionText @param {{text: string, correct?: boolean}[]} choices */
function mcq(questionText, choices) {
	const correctIndex = choices.findIndex((c) => c.correct);
	if (correctIndex < 0) {
		throw new Error('Each MCQ needs one correct: ' + questionText);
	}
	return {
		text: questionText,
		options: {
			create: choices.map((c) => ({
				text: c.text,
				isCorrect: !!c.correct,
			})),
		},
	};
}

/** @param {{ text: string, options: [string, string, string, string], correctIndex: 0|1|2|3 }[]} defs */
function questionsFromDefs(defs) {
	return defs.map((d) =>
		mcq(
			d.text,
			d.options.map((text, i) => ({ text, correct: i === d.correctIndex }))
		)
	);
}

async function main() {
	console.log('Seeding database (this replaces all existing users and courses)…');

	await clearAll();

	const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

	const instructor = await prisma.user.create({
		data: {
			name: 'Demo Instructor',
			email: 'instructor@test.com',
			password: passwordHash,
			role: 'INSTRUCTOR',
		},
	});

	const student = await prisma.user.create({
		data: {
			name: 'Demo Student',
			email: 'student@test.com',
			password: passwordHash,
			role: 'STUDENT',
		},
	});

	// --- Course 1: Web Foundations (3 modules, 9 lectures, 3 quizzes × 5 Qs) ---
	await prisma.course.create({
		data: {
			title: 'Web Foundations: HTML, CSS & How the Web Works',
			description:
				'A structured beginner path: how browsers load pages, semantic HTML, CSS layout (Flexbox & Grid), and the tools developers use daily. Each module ends with a graded quiz. Videos are real lessons from established instructors on YouTube.',
			category: 'Programming',
			difficulty: 'BEGINNER',
			thumbnailUrl: 'https://picsum.photos/seed/webfound/800/450',
			status: 'PUBLISHED',
			instructorId: instructor.id,
			modules: {
				create: [
					{
						title: 'Module 1 — The web stack & HTML',
						description:
							'HTTP at a high level, HTML documents, semantic structure, and accessibility-minded markup.',
						order: 1,
						lectures: {
							create: [
								{
									title: 'How does the internet deliver web pages?',
									description:
										'Clients, servers, DNS, and why HTML is the universal skeleton of the web.',
									videoUrl: YT.internetHow,
									order: 1,
								},
								{
									title: 'HTML in practice — structure fast',
									description:
										'Build a mental model of tags, attributes, and the DOM from a compact lesson.',
									videoUrl: YT.html12min,
									order: 2,
									resources: {
										create: [
											{
												title: 'HTML semantics — extra notes (PDF)',
												fileUrl: SAMPLE_PDF,
											},
										],
									},
								},
								{
									title: 'HTML5 features you will use every day',
									description: 'Sections, media elements, and forms in modern HTML.',
									videoUrl: YT.html5doc,
									order: 3,
								},
							],
						},
						quiz: {
							create: {
								title: 'Module 1 — Web & HTML checkpoint',
								passingScore: 70,
								isPublished: true,
								questions: {
									create: questionsFromDefs([
										{
											text: 'What does HTML primarily describe in a web application?',
											options: [
												'The visual styling of every pixel',
												'The structure and meaning of content',
												'The database schema',
												'The server operating system',
											],
											correctIndex: 1,
										},
										{
											text: 'Which element is most appropriate for the primary unique content of a page?',
											options: ['<aside>', '<main>', '<div class="stuff">', '<link>'],
											correctIndex: 1,
										},
										{
											text: 'Why are semantic HTML elements preferred over anonymous <div> soup?',
											options: [
												'They always load faster than divs',
												'They help accessibility, SEO, and maintainability',
												'They replace the need for CSS',
												'They encrypt user data',
											],
											correctIndex: 1,
										},
										{
											text: 'What is the typical role of DNS when you open a website?',
											options: [
												'Compiles JavaScript to machine code',
												'Resolves human-readable hostnames to addresses',
												'Renders CSS animations',
												'Stores passwords in the browser',
											],
											correctIndex: 1,
										},
										{
											text: 'Which attribute provides alternative text for images (important for screen readers)?',
											options: ['title', 'alt', 'src', 'role="img" only'],
											correctIndex: 1,
										},
									]),
								},
							},
						},
					},
					{
						title: 'Module 2 — CSS fundamentals & layout',
						description:
							'Selectors, the cascade, the box model, Flexbox, and CSS Grid for real layouts.',
						order: 2,
						lectures: {
							create: [
								{
									title: 'CSS crash course — selectors to styling',
									description: 'From zero to styled pages: syntax, classes, and the cascade.',
									videoUrl: YT.cssCrash,
									order: 1,
								},
								{
									title: 'CSS for beginners — core concepts',
									description: 'Another clear pass through colors, typography, and spacing.',
									videoUrl: YT.cssWds,
									order: 2,
								},
								{
									title: 'Flexbox — one-dimensional layouts',
									description: 'Align and distribute items along a row or column.',
									videoUrl: YT.flexbox,
									order: 3,
								},
								{
									title: 'CSS Grid — two-dimensional layouts',
									description: 'Rows, columns, gaps, and responsive grids.',
									videoUrl: YT.cssGrid,
									order: 4,
								},
							],
						},
						quiz: {
							create: {
								title: 'Module 2 — CSS checkpoint',
								passingScore: 72,
								isPublished: true,
								questions: {
									create: questionsFromDefs([
										{
											text: 'In the CSS box model, what sits directly between padding and margin?',
											options: ['Outline', 'Border', 'Shadow', 'Z-index stack'],
											correctIndex: 1,
										},
										{
											text: 'Flexbox is best described as optimized for:',
											options: [
												'Two-dimensional grid templates only',
												'One-dimensional alignment along a main axis',
												'Database normalization',
												'Server-side sessions',
											],
											correctIndex: 1,
										},
										{
											text: 'CSS Grid is especially strong when you need:',
											options: [
												'Only inline text wrapping',
												'2D placement of items in rows and columns',
												'Binary file compression',
												'JWT signing',
											],
											correctIndex: 1,
										},
										{
											text: 'When two CSS rules target the same property, what mainly decides the winner?',
											options: [
												'File name alphabetical order',
												'Specificity, order, and importance (the cascade)',
												'The oldest rule always wins',
												'Screen DPI',
											],
											correctIndex: 1,
										},
										{
											text: 'Which layout mode uses properties like justify-content and align-items?',
											options: ['Table layout', 'Flexbox', 'Float layout only', 'Print media'],
											correctIndex: 1,
										},
									]),
								},
							},
						},
					},
					{
						title: 'Module 3 — JavaScript in the browser',
						description:
							'Core language concepts, the DOM, and asynchronous patterns you will see in real codebases.',
						order: 3,
						lectures: {
							create: [
								{
									title: 'JavaScript crash course for beginners',
									description: 'Variables, functions, arrays, objects, and control flow.',
									videoUrl: YT.jsCrash,
									order: 1,
								},
								{
									title: 'The DOM — connecting JS to the page',
									description: 'Selecting elements, events, and updating the UI.',
									videoUrl: YT.jsDom,
									order: 2,
								},
								{
									title: 'Async JavaScript — promises & patterns',
									description: 'Why network and I/O code is asynchronous in the browser.',
									videoUrl: YT.jsAsync,
									order: 3,
								},
							],
						},
						quiz: {
							create: {
								title: 'Module 3 — JavaScript checkpoint',
								passingScore: 70,
								isPublished: true,
								questions: {
									create: questionsFromDefs([
										{
											text: 'What is the DOM in a browser context?',
											options: [
												'A database migration tool',
												'A tree representation of the HTML document',
												'A CSS preprocessor',
												'A Linux package manager',
											],
											correctIndex: 1,
										},
										{
											text: 'Which statement best describes a JavaScript function?',
											options: [
												'A reusable block that can take inputs and return a value',
												'A PNG image format',
												'A SQL join type',
												'A DNS record',
											],
											correctIndex: 0,
										},
										{
											text: 'Why do browsers use asynchronous APIs for network requests?',
											options: [
												'To freeze the entire tab until data returns',
												'To avoid blocking the main UI thread during waits',
												'To disable JavaScript security',
												'To compile HTML to PDF',
											],
											correctIndex: 1,
										},
										{
											text: 'const and let differ from var primarily in:',
											options: [
												'const/let respect block scope and safer temporal rules',
												'var is always faster on GPUs',
												'var only works in WebAssembly',
												'There is no practical difference',
											],
											correctIndex: 0,
										},
										{
											text: 'addEventListener is used to:',
											options: [
												'Add a new HTML element to the database',
												'Subscribe to user or browser events on a node',
												'Compile TypeScript automatically',
												'Resize images server-side',
											],
											correctIndex: 1,
										},
									]),
								},
							},
						},
					},
				],
			},
		},
	});

	// --- Course 2: UX & Design (2 modules, 5 lectures, 2 quizzes) ---
	await prisma.course.create({
		data: {
			title: 'UX, UI & Design Thinking for Product Teams',
			description:
				'From laws of UX and research-backed heuristics to practical UI craft in Figma and structured design thinking workshops. Includes longer NN/g-style talks and hands-on UI walkthroughs.',
			category: 'Design',
			difficulty: 'INTERMEDIATE',
			thumbnailUrl: 'https://picsum.photos/seed/uxdeep/800/450',
			status: 'PUBLISHED',
			instructorId: instructor.id,
			modules: {
				create: [
					{
						title: 'Module 1 — UX foundations & heuristics',
						description: 'How people perceive, decide, and scan interfaces.',
						order: 1,
						lectures: {
							create: [
								{
									title: 'Laws of UX — quick principles',
									description: 'Mental models, Hick’s law, Fitts’s law, and consistency.',
									videoUrl: YT.uxLaws,
									order: 1,
								},
								{
									title: 'Jakob Nielsen on usability',
									description: 'Research perspective on what “usable” means in practice.',
									videoUrl: YT.uxNng,
									order: 2,
									resources: {
										create: [
											{
												title: 'Heuristic review checklist (PDF)',
												fileUrl: SAMPLE_PDF,
											},
										],
									},
								},
								{
									title: 'Design thinking overview',
									description: 'Empathize, define, ideate, prototype, test — as a cycle.',
									videoUrl: YT.designThinking,
									order: 3,
								},
							],
						},
						quiz: {
							create: {
								title: 'Module 1 — UX foundations quiz',
								passingScore: 65,
								isPublished: true,
								questions: {
									create: questionsFromDefs([
										{
											text: 'Affordances in UI design refer to:',
											options: [
												'Maximum server throughput',
												'Perceived clues about how an control works',
												'Legal software licenses',
												'GPU shader languages',
											],
											correctIndex: 1,
										},
										{
											text: 'Consistency across an app primarily improves:',
											options: [
												'Predictability and learnability',
												'RAM clock speed',
												'SQL index size',
												'Certificate chain depth',
											],
											correctIndex: 0,
										},
										{
											text: 'Heuristic evaluation is best described as:',
											options: [
												'Measuring database query cost',
												'Expert review against usability principles',
												'A/B testing only headline copy',
												'Compressing video codecs',
											],
											correctIndex: 1,
										},
										{
											text: 'Design thinking emphasizes:',
											options: [
												'Shipping without user input',
												'Iterating from problem understanding to validated prototypes',
												'Replacing designers with random palettes',
												'Avoiding prototypes entirely',
											],
											correctIndex: 1,
										},
									]),
								},
							},
						},
					},
					{
						title: 'Module 2 — UI craft & visual design',
						description: 'Hierarchy, spacing systems, and a full UI walkthrough.',
						order: 2,
						lectures: {
							create: [
								{
									title: 'Modern UI design walkthrough',
									description: 'From wireframe thinking to polished component styling.',
									videoUrl: YT.figmaUi,
									order: 1,
								},
								{
									title: 'HTTP & APIs — context for front-end designers',
									description: 'Light technical context so you can collaborate with engineers.',
									videoUrl: YT.httpCrash,
									order: 2,
								},
							],
						},
						quiz: {
							create: {
								title: 'Module 2 — UI & collaboration quiz',
								passingScore: 68,
								isPublished: true,
								questions: {
									create: questionsFromDefs([
										{
											text: 'Visual hierarchy helps users by:',
											options: [
												'Hiding all secondary actions forever',
												'Signaling importance and scan order',
												'Disabling keyboard navigation',
												'Removing color from the brand',
											],
											correctIndex: 1,
										},
										{
											text: 'A design system primarily provides:',
											options: [
												'Random one-off styles per screen',
												'Shared components, tokens, and documented patterns',
												'Only backend API routes',
												'Database backups',
											],
											correctIndex: 1,
										},
										{
											text: 'REST APIs are often discussed with front-end teams because:',
											options: [
												'They define how data is requested and shaped over HTTP',
												'They replace the need for HTML',
												'They are only used in Photoshop',
												'They compile CSS automatically',
											],
											correctIndex: 0,
										},
										{
											text: 'Whitespace in UI design is valuable because it:',
											options: [
												'Wastes space intentionally',
												'Groups related items and reduces cognitive load',
												'Forces mobile-only layouts',
												'Prevents accessibility features',
											],
											correctIndex: 1,
										},
									]),
								},
							},
						},
					},
				],
			},
		},
	});

	// --- Course 3: JavaScript deep track (2 modules, 4 lectures) ---
	await prisma.course.create({
		data: {
			title: 'JavaScript Fundamentals & Browser APIs',
			description:
				'Consolidate core JS plus how scripts interact with the DOM and asynchronous flows. Ideal after Web Foundations or as a refresher before a framework course.',
			category: 'Programming',
			difficulty: 'INTERMEDIATE',
			thumbnailUrl: 'https://picsum.photos/seed/jsdeep/800/450',
			status: 'PUBLISHED',
			instructorId: instructor.id,
			modules: {
				create: [
					{
						title: 'Module 1 — Language core',
						description: 'Syntax, data structures, and functions in modern JS.',
						order: 1,
						lectures: {
							create: [
								{
									title: 'JavaScript crash course',
									description: 'Fast, practical coverage of essentials.',
									videoUrl: YT.jsCrash,
									order: 1,
								},
								{
									title: 'Understanding the DOM',
									description: 'Bridging data and markup with the document API.',
									videoUrl: YT.jsDom,
									order: 2,
								},
							],
						},
						quiz: {
							create: {
								title: 'Module 1 — JS core quiz',
								passingScore: 75,
								isPublished: true,
								questions: {
									create: questionsFromDefs([
										{
											text: 'Which type is used for arbitrary-length text in JavaScript?',
											options: ['char', 'string', 'text', 'varchar'],
											correctIndex: 1,
										},
										{
											text: 'Array.prototype.map returns:',
											options: [
												'The same array mutated in place',
												'A new array of transformed elements',
												'Always undefined',
												'A Promise of a single number',
											],
											correctIndex: 1,
										},
										{
											text: 'querySelector returns:',
											options: [
												'All matching elements as a NodeList',
												'The first element matching the selector or null',
												'A jQuery object',
												'A WebSocket',
											],
											correctIndex: 1,
										},
										{
											text: 'JSON.parse is used to:',
											options: [
												'Turn a JS object into a string',
												'Turn a JSON string into a JS value',
												'Minify CSS',
												'Sign a JWT without a secret',
											],
											correctIndex: 1,
										},
									]),
								},
							},
						},
					},
					{
						title: 'Module 2 — Async & the network',
						description: 'Why fetch is async and how to structure code that waits.',
						order: 2,
						lectures: {
							create: [
								{
									title: 'Async JavaScript patterns',
									description: 'Timers, promises, and readability.',
									videoUrl: YT.jsAsync,
									order: 1,
								},
								{
									title: 'How HTTP works (context for fetch)',
									description: 'Methods, status codes, and JSON payloads.',
									videoUrl: YT.httpCrash,
									order: 2,
								},
							],
						},
						quiz: {
							create: {
								title: 'Module 2 — Async & HTTP quiz',
								passingScore: 70,
								isPublished: true,
								questions: {
									create: questionsFromDefs([
										{
											text: 'fetch in the browser returns:',
											options: [
												'The response body string immediately',
												'A Promise that resolves to a Response',
												'A synchronous XML document',
												'An open WebSocket',
											],
											correctIndex: 1,
										},
										{
											text: 'An HTTP 404 status means:',
											options: [
												'Success with no body',
												'The requested resource was not found',
												'The server is rebooting',
												'Authentication succeeded',
											],
											correctIndex: 1,
										},
										{
											text: 'async/await is syntactic sugar over:',
											options: [
												'Only callbacks with no promises',
												'Promises and thenable chains',
												'SQL transactions',
												'CSS animations',
											],
											correctIndex: 1,
										},
										{
											text: 'Blocking the main thread with long synchronous work tends to:',
											options: [
												'Improve scroll performance',
												'Cause janky UI and frozen interactions',
												'Speed up DNS',
												'Disable all event listeners safely',
											],
											correctIndex: 1,
										},
									]),
								},
							},
						},
					},
				],
			},
		},
	});

	// --- Course 4: SQL & data (2 modules, 5 lectures) ---
	await prisma.course.create({
		data: {
			title: 'SQL, Databases & Analytical Thinking',
			description:
				'Learn relational thinking with SQL: filtering, joins, aggregations, and how data informs decisions. Uses a full-course SQL walkthrough plus focused join tutorials.',
			category: 'Data Science',
			difficulty: 'INTERMEDIATE',
			thumbnailUrl: 'https://picsum.photos/seed/sqldata/800/450',
			status: 'PUBLISHED',
			instructorId: instructor.id,
			modules: {
				create: [
					{
						title: 'Module 1 — SQL foundations',
						description: 'Tables, SELECT, WHERE, GROUP BY, and real exercises.',
						order: 1,
						lectures: {
							create: [
								{
									title: 'SQL full course for beginners',
									description: 'Long-form zero-to-querying course.',
									videoUrl: YT.sqlFull,
									order: 1,
									resources: {
										create: [
											{
												title: 'SQL reference cheat-sheet (PDF)',
												fileUrl: SAMPLE_PDF,
											},
										],
									},
								},
								{
									title: 'SQL joins explained',
									description: 'Inner, left, and why join order matters.',
									videoUrl: YT.sqlJoins,
									order: 2,
								},
							],
						},
						quiz: {
							create: {
								title: 'Module 1 — SQL quiz',
								passingScore: 70,
								isPublished: true,
								questions: {
									create: questionsFromDefs([
										{
											text: 'PRIMARY KEY best ensures:',
											options: [
												'Rows are uniquely identifiable in a table',
												'Columns are encrypted automatically',
												'Queries never need indexes',
												'Foreign keys are forbidden',
											],
											correctIndex: 0,
										},
										{
											text: 'A LEFT JOIN returns:',
											options: [
												'Only rows that match in both tables',
												'All rows from the left plus matches from the right',
												'Only the right table',
												'Random samples',
											],
											correctIndex: 1,
										},
										{
											text: 'WHERE is evaluated relative to GROUP BY as:',
											options: [
												'Always after GROUP BY in standard SQL',
												'Before grouping (filters rows)',
												'Only inside INSERT',
												'Never used with SELECT',
											],
											correctIndex: 1,
										},
										{
											text: 'COUNT(*) counts:',
											options: [
												'Only non-null primary keys',
												'All rows in the grouped set',
												'Only distinct JSON keys',
												'CPU cores',
											],
											correctIndex: 1,
										},
									]),
								},
							},
						},
					},
					{
						title: 'Module 2 — Data literacy & visualization context',
						description: 'Metrics, charts, and bias — the human side of data work.',
						order: 2,
						lectures: {
							create: [
								{
									title: 'Data storytelling basics',
									description: 'Framing insights for decision makers.',
									videoUrl: YT.dataStory,
									order: 1,
								},
								{
									title: 'Choosing chart types',
									description: 'When bars, lines, and scatterplots help or mislead.',
									videoUrl: YT.dataViz,
									order: 2,
								},
								{
									title: 'Bias and ethics in metrics',
									description: 'What we measure shapes behavior.',
									videoUrl: YT.biasData,
									order: 3,
								},
							],
						},
						quiz: {
							create: {
								title: 'Module 2 — Data literacy quiz',
								passingScore: 65,
								isPublished: true,
								questions: {
									create: questionsFromDefs([
										{
											text: 'A good metric should ideally be:',
											options: [
												'Ambiguous to many teams',
												'Actionable, understandable, and auditable',
												'Secret from stakeholders',
												'Maximized without tradeoffs',
											],
											correctIndex: 1,
										},
										{
											text: 'Survivorship bias occurs when:',
											options: [
												'We only observe successes that “survived” a filter',
												'We backup databases daily',
												'We use HTTPS',
												'We normalize email addresses',
											],
											correctIndex: 0,
										},
										{
											text: 'A pie chart is often a poor choice when:',
											options: [
												'Comparing many similar slices or precise differences',
												'Showing exactly one category',
												'Printing in grayscale only',
												'There is no data',
											],
											correctIndex: 0,
										},
										{
											text: 'Operationalizing a metric means:',
											options: [
												'Deleting historical data',
												'Defining exactly how it is measured',
												'Avoiding dashboards',
												'Using only pie charts',
											],
											correctIndex: 1,
										},
									]),
								},
							},
						},
					},
				],
			},
		},
	});

	// --- Course 5: Business communication ---
	await prisma.course.create({
		data: {
			title: 'Business Communication & Async Collaboration',
			description:
				'Professional writing, email norms, presentations, and running effective remote meetings. Built from short workplace-communication lessons on YouTube.',
			category: 'Business',
			difficulty: 'BEGINNER',
			thumbnailUrl: 'https://picsum.photos/seed/bizcom/800/450',
			status: 'PUBLISHED',
			instructorId: instructor.id,
			modules: {
				create: [
					{
						title: 'Module 1 — Writing & email',
						description: 'Clarity, tone, and respect for the reader’s time.',
						order: 1,
						lectures: {
							create: [
								{
									title: 'Professional email habits',
									description: 'Subject lines, calls to action, and follow-ups.',
									videoUrl: YT.bizEmail,
									order: 1,
								},
								{
									title: 'Presentation skills for work',
									description: 'Structure, slides, and delivery basics.',
									videoUrl: YT.presentations,
									order: 2,
								},
							],
						},
						quiz: {
							create: {
								title: 'Module 1 — Written communication quiz',
								passingScore: 60,
								isPublished: true,
								questions: {
									create: questionsFromDefs([
										{
											text: 'The first screen of an email should usually:',
											options: [
												'Hide the request in the final paragraph only',
												'State the purpose and desired action clearly',
												'Use only ALL CAPS for urgency',
												'Omit a subject line',
											],
											correctIndex: 1,
										},
										{
											text: 'BLUF (Bottom Line Up Front) means:',
											options: [
												'Put the key takeaway before details',
												'Never use bullet points',
												'Always attach 20MB files',
												'Write only in passive voice',
											],
											correctIndex: 0,
										},
										{
											text: 'When declining a request professionally you should:',
											options: [
												'Ignore the message',
												'Offer context, empathy, and alternatives if possible',
												'CC the entire company',
												'Use sarcasm to soften the blow',
											],
											correctIndex: 1,
										},
									]),
								},
							},
						},
					},
					{
						title: 'Module 2 — Meetings & alignment',
						description: 'Agendas, decisions, and follow-through.',
						order: 2,
						lectures: {
							create: [
								{
									title: 'Running better meetings',
									description: 'Roles, timeboxes, and outcomes.',
									videoUrl: YT.meetings,
									order: 1,
								},
								{
									title: 'What is a KPI?',
									description: 'Connecting meetings to measurable outcomes.',
									videoUrl: YT.metrics101,
									order: 2,
								},
							],
						},
						quiz: {
							create: {
								title: 'Module 2 — Meetings & metrics quiz',
								passingScore: 65,
								isPublished: true,
								questions: {
									create: questionsFromDefs([
										{
											text: 'An effective meeting agenda should:',
											options: [
												'Be secret until the meeting starts',
												'List topics, owners, and desired decisions',
												'Only include jokes',
												'Replace the need for notes',
											],
											correctIndex: 1,
										},
										{
											text: 'Meeting notes are most valuable when they capture:',
											options: [
												'Verbatim transcripts only',
												'Decisions, action items, and owners',
												'Only attendance',
												'WiFi passwords',
											],
											correctIndex: 1,
										},
										{
											text: 'A KPI should generally be:',
											options: [
												'Chosen without team input',
												'Aligned to outcomes the team can influence',
												'Maximized even if it harms users',
												'Secret from leadership',
											],
											correctIndex: 1,
										},
									]),
								},
							},
						},
					},
				],
			},
		},
	});

	// --- Course 6: Published data literacy (was draft) + draft shell for instructor tests ---
	await prisma.course.create({
		data: {
			title: 'Data Literacy for Decision Makers',
			description:
				'Non-technical leaders: understand metrics, charts, and common pitfalls without writing SQL. Pairs well with the SQL course for mixed teams.',
			category: 'Data Science',
			difficulty: 'BEGINNER',
			thumbnailUrl: 'https://picsum.photos/seed/datalit2/800/450',
			status: 'PUBLISHED',
			instructorId: instructor.id,
			modules: {
				create: [
					{
						title: 'Module 1 — Metrics that matter',
						description: 'Definitions, baselines, and avoiding vanity numbers.',
						order: 1,
						lectures: {
							create: [
								{
									title: 'What is a metric?',
									description: 'Operational definitions and accountability.',
									videoUrl: YT.metrics101,
									order: 1,
								},
								{
									title: 'Telling stories with data',
									description: 'Narrative structure for analysts and PMs.',
									videoUrl: YT.dataStory,
									order: 2,
								},
							],
						},
						quiz: {
							create: {
								title: 'Module 1 — Metrics quiz',
								passingScore: 65,
								isPublished: true,
								questions: {
									create: questionsFromDefs([
										{
											text: 'A vanity metric often:',
											options: [
												'Directly drives product decisions',
												'Looks impressive but lacks actionable insight',
												'Is always revenue',
												'Cannot be charted',
											],
											correctIndex: 1,
										},
										{
											text: 'Comparing metrics without a baseline can:',
											options: [
												'Always prove causation',
												'Mislead because context is missing',
												'Replace A/B tests',
												'Remove sampling error',
											],
											correctIndex: 1,
										},
										{
											text: 'Leading indicators tend to:',
											options: [
												'Change before outcomes you care about',
												'Always equal lagging indicators',
												'Be impossible to measure',
												'Require no data collection',
											],
											correctIndex: 0,
										},
									]),
								},
							},
						},
					},
					{
						title: 'Module 2 — Charts, bias, and honesty',
						description: 'Reading visuals critically.',
						order: 2,
						lectures: {
							create: [
								{
									title: 'Introduction to data visualization choices',
									description: 'Integrity in axes, labels, and aggregation.',
									videoUrl: YT.dataViz,
									order: 1,
								},
								{
									title: 'Bias in data collection and interpretation',
									description: 'Sampling, confirmation bias, and incentives.',
									videoUrl: YT.biasData,
									order: 2,
									resources: {
										create: [
											{
												title: 'Ethics reading (PDF)',
												fileUrl: SAMPLE_PDF,
											},
										],
									},
								},
							],
						},
						quiz: {
							create: {
								title: 'Module 2 — Visualization & ethics quiz',
								passingScore: 65,
								isPublished: true,
								questions: {
									create: questionsFromDefs([
										{
											text: 'Truncating the y-axis at a non-zero baseline can:',
											options: [
												'Make small differences look enormous',
												'Always be required for honesty',
												'Only affect pie charts',
												'Remove the need for labels',
											],
											correctIndex: 0,
										},
										{
											text: 'Confirmation bias leads teams to:',
											options: [
												'Seek and remember evidence that supports prior beliefs',
												'Randomize experiments perfectly',
												'Ignore all dashboards',
												'Automate data cleaning',
											],
											correctIndex: 0,
										},
										{
											text: 'Transparency in analytics includes:',
											options: [
												'Hiding data definitions',
												'Documenting definitions, filters, and known gaps',
												'Deleting outliers without mention',
												'Using only emojis in reports',
											],
											correctIndex: 1,
										},
									]),
								},
							},
						},
					},
				],
			},
		},
	});

	// --- Course 7: DRAFT — instructor can publish after tweaks ---
	await prisma.course.create({
		data: {
			title: 'Product Strategy Workshop (Draft)',
			description:
				'Placeholder draft: duplicate modules from another course or add your own modules, quiz, and publish from the instructor dashboard.',
			category: 'Business',
			difficulty: 'ADVANCED',
			thumbnailUrl: 'https://picsum.photos/seed/prodstrat/800/450',
			status: 'DRAFT',
			instructorId: instructor.id,
			modules: {
				create: [
					{
						title: 'Kickoff — vision and outcomes',
						description: 'Replace with your real workshop outline.',
						order: 1,
						lectures: {
							create: [
								{
									title: 'What is product strategy?',
									description: 'Draft lecture — swap URL or content anytime.',
									videoUrl: YT.designThinking,
									order: 1,
								},
							],
						},
					},
				],
			},
		},
	});

	console.log('');
	console.log('Done. Demo accounts (password for both):', DEMO_PASSWORD);
	console.log('  Instructor:', instructor.email);
	console.log('  Student:   ', student.email);
	console.log('');
	console.log(
		'6 PUBLISHED courses (YouTube lectures + published quizzes). 1 DRAFT for publish workflow.'
	);
	console.log('');
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});

const BOOK_QUALITY = [
  {min: 1, max: 3, result: {value: "Best", worth: 900}},
  {min: 4, max: 10, result: {value: "Good", worth: 200}},
  {min: 11, max: 80, result: {value: "Common", worth: 0}},
  {min: 81, max: 100, result: {value: "Poor", worth: -25}}
];

const BOOK_TOPIC = [
  {min: 1, max: 25, result: {value: "Biography"}},
  {min: 26, max: 30, result: {value: "Bestiary"}},
  {min: 31, max: 50, result: {value: "Cook Book"}},
  {min: 51, max: 60, result: {value: "Fiction"}},
  {min: 61, max: 70, result: {value: "Guidebook or Travel Account"}},
  {min: 71, max: 80, result: {value: "Religious Doctrine"}},
  {min: 81, max: 98, result: {value: "Scholarship"}},
  {min: 99, max: 100, result: {value: "Forbidden, Exotic or Heretical Topic"}}
];

async function rollFromTableCode(table) {
  let roll = (await new Roll(`1d100`).roll()).total;
  return table.find((entity) => entity.min <= roll && entity.max >= roll);
}

async function generate_book() {
  let worthModifier = 100;

  // Quality
  let bookQuality = await rollFromTableCode(BOOK_QUALITY);
  console.log(bookQuality);
  worthModifier += bookQuality.result.worth;

  // Topic
  let bookTopic = await rollFromTableCode(BOOK_TOPIC);
  console.log(bookTopic);

  // Pages
  let bookPages = (await new Roll(`1d10`).roll()).total * 50;
  console.log(bookPages);

  // Type
  let bookType = await game.wfrp4e.tables.rollTable("books-type", {hideDSN: true});
  console.log(bookType);

  // Age
  let bookAge = await game.wfrp4e.tables.rollTable("books-age", {hideDSN: true});
  let bookAgeDetailed = (await new Roll(`1d10`).roll()).total * bookAge.object.flags.age.modifier;
  console.log(bookAge);

  // Condition
  let bookCondition = await game.wfrp4e.tables.rollTable("books-condition", {
    modifier: bookAge.object.flags.age.condition,
    minOne: true,
    hideDSN: true
  });
  worthModifier += bookCondition.object.flags.worth ?? 0;
  let bookConditionResult = bookCondition.result;
  for (const obj of Object.entries(bookCondition.object.flags.rolls ?? {})) {
    if (bookCondition.roll === obj[0]) {
      bookConditionResult += obj[1];
    }
  }
  console.log(bookCondition);

  // Features
  let bookFeatures = await game.wfrp4e.tables.rollTable("books-features", {hideDSN: true});
  console.log(bookFeatures);

  // Features
  let bookLanguage = await game.wfrp4e.tables.rollTable("books-language", {hideDSN: true});
  let bookLanguageResult = bookLanguage.result;
  if (bookLanguage.roll % 11 === 0 || bookLanguage.roll === 100) {
    let originalBookLanguage = await game.wfrp4e.tables.rollTable("books-original-language", {hideDSN: true});
    bookLanguageResult = `${bookLanguageResult} (Translated from ${originalBookLanguage.result})`;
  }
  console.log(bookLanguage);

  // Name
  let topic = bookTopic.result.value.toLowerCase();
  let name = "Random Book";
  switch (topic) {
    case "biography":
      let reverse = false;
      let element_1 = await game.wfrp4e.tables.rollTable(`books-${topic}-1`, {hideDSN: true});
      while (element_1.roll > 98) {
        element_1 = await game.wfrp4e.tables.rollTable(`books-${topic}-1`, {hideDSN: true});
        reverse = !reverse;
      }
      let element_2 = await game.wfrp4e.tables.rollTable(`books-${topic}-2`, {hideDSN: true});
      while (element_2.roll > 98) {
        element_2 = await game.wfrp4e.tables.rollTable(`books-${topic}-2`, {hideDSN: true});
        reverse = !reverse;
      }
      let element_3 = await game.wfrp4e.tables.rollTable(`books-${topic}-3`, {hideDSN: true});
      let element_4 = await game.wfrp4e.tables.rollTable(`books-${topic}-4`, {hideDSN: true});

      if (!reverse) {
        name = [element_1.result, element_2.result, element_3.result].join(" ");
      } else {
        name = [element_2.result, element_1.result, element_3.result].join(" ");
      }
      name += `: ${element_4.result}`;
      break;
  }

  let description = `
		<p><strong>Quality:</strong> ${bookQuality.result.value}</p>
		<p><strong>Topic:</strong> ${bookTopic.result.value}</p>
		<p><strong>Pages:</strong> ${bookPages}</p>
		<p><strong>Type:</strong> ${bookType.result}</p>
		<p><strong>Age:</strong> ${bookAge.result} (${bookAgeDetailed} ${bookAge.object.flags.age.label})</p>
		<p><strong>Condition:</strong> ${bookConditionResult}</p>
		<p><strong>Notable Features:</strong> ${bookFeatures.result}</p>
		<p><strong>Language:</strong> ${bookLanguageResult}</p>`;

  for (const dice of description.match(/[0-9]*d[1-9][0-9]*/g) ?? []) {
    description = description.replace(dice, (await new Roll(dice).roll()).total);
  }

  for (const origin of name.match(/\[\[origin]]/g) ?? []) {
    name = name.replace(origin, (await game.wfrp4e.tables.rollTable(`books-origin`, {hideDSN: true})).result);
  }

  for (const human_name of name.match(/\[\[name]]/g) ?? []) {
    name = name.replace(human_name, NameGenWfrp.generateName({species: "Human", gender: "Male"}));
  }

  return {
    name: name,
    type: "trapping",
    img: "modules/wfrp4e-core/icons/equipment/book_documents/book-apothecary.png",
    data: {
      trappingType: {
        value: "booksAndDocuments"
      },
      description: {
        value: description
      },
      gmdescription: {
        value: `<p><strong>Worth Modifier:</strong> ${worthModifier}%</p>`
      },
      encumbrance: {value: 1}
    }
  };
}

let books_amount = 1;
for (let i = 0; i < books_amount; i++) {
  ItemWfrp4e.create(await generate_book()).then((itl) => {
    ChatMessage.create(
      {
        content:
          "<h1>Random Books Generator</h1><p>@Item[" +
          itl.id +
          "]{" +
          itl.name +
          "}</p><p>" +
          itl.description.value +
          "</p>"
      },
      false
    );
  });
}

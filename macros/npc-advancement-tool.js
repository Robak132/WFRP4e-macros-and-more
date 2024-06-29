main();

async function getCareers() {
  const careerList = {};
  const careers = await game.wfrp4e.utility.findAll("career", game.i18n.localize("CAREER.Loading"));
  careers.forEach((tier, i) => {
    const clsObject = careerList[tier.system.class.value] ?? {};
    const careerGroup = clsObject[tier.system.careergroup.value] ?? [];
    careerGroup.push({
      link: tier.link,
      level: tier.level.value,
      img: tier.img,
      name: tier.name,
      index: i,
      careerGroup: tier.system.careergroup.value,
      careerClass: tier.system.class.value
    });
    clsObject[tier.system.careergroup.value] = careerGroup;
    careerList[tier.system.class.value] = clsObject;
  });
  return careerList;
}

async function sortCareers(careerList) {
  let sortedCareerList = {};
  for (const [careerClass, careerGroups] of Object.entries(careerList)) {
    const sortedCareerGroups = {};
    for (const [careerGroup, careers] of Object.entries(careerGroups)) {
      sortedCareerGroups[careerGroup] = careers.sort((a, b) => a.level - b.level);
    }
    sortedCareerList[careerClass] = Object.fromEntries(Object.entries(sortedCareerGroups).sort());
  }
  sortedCareerList = Object.fromEntries(Object.entries(sortedCareerList).sort());
  return sortedCareerList;
}

async function getCareerOptions() {
  let careerList = await getCareers();
  careerList = await sortCareers(careerList);
  let result = "";
  for (const [careerClass, careerGroups] of Object.entries(careerList)) {
    result += `<option disabled>${careerClass}</option>`;
    for (const [careerGroup, careers] of Object.entries(careerGroups)) {
      result += `<option disabled>&nbsp;&nbsp;${careerGroup}</option>`;
      for (const career of careers) {
        result += `<option value="${career.index}">&nbsp;&nbsp;&nbsp;&nbsp;${career.level} - ${career.name}</option>`;
      }
    }
  }
  return result;
}

async function submit() {}

async function main() {
  const careerOptions = await getCareerOptions();
  await new Dialog(
    {
      title: "NPC Advancement Tool",
      content: `<form>
        <div class="form-group">
          <p style="flex: 1" class="section-title">Attributes</p>
          <select style="flex: 2" name="characteristics">
            <option value="0">Average</option>
            <option value="5">Above Average</option>
            <option value="10">Perfect Specimen</option>
          </select>
        </div>
        <div class="form-group">
          <p style="flex: 1" class="section-title">Career</p>
          <select style="flex: 2">
            ${careerOptions}
          </select>
        </div>
        <div class="form-group">
          <p style="flex: 1" class="section-title">Competency</p>
          <select style="flex: 2">
            <option value="1">Competent</option>
            <option value="2">Proficient</option>
            <option value="3">Veteran</option>
            <option value="4">Elite</option>
            <option value="5">Apex</option>
          </select>
        </div>
      </form>`,
      buttons: {
        no: {
          icon: "<i class='fas fa-times'></i>",
          label: game.i18n.localize("Cancel")
        },
        yes: {
          icon: "<i class='fas fa-check'></i>",
          label: game.i18n.localize("Apply"),
          callback: async (html) => await submit(html)
        }
      },
      default: "yes"
    },
    {width: 500}
  ).render(true);
}

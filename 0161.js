// const placesARR = ["place 1", "place 2", "place 3", "place4"]

// const showPlacesARR = [];

// let radnomARR = [];

// function randomize(){
//         let randomNum = Math.random()
//         // math.floor

// showPlacesARR PUSH = placesARR[randomNum]
// // 

// TESTING REPEATS:

// // for (numbers in RandomARR)
// //         if(numbers === randomARR[numbers])
// //         dont put it in reroll

// // else
// //     put number in Array}

// // randomARR[numbers] = randomNum





// function getItem(){

//     return document.getElementById(`box-$[itemNumber}`);
// }

// function makeFindItemArray() {


// }


// const navbar = document.getElementById("white-mode-id")

// function toggleWhiteMode() {
//         console.dir(navbar);

// navbar.addEventListener("onmouseover", toggleWhiteMode)}

const galleryArray = ["GalleryNARC", "GallerySR", "GalleryTM"];

const gallery = []; 



function randomize(){

let randomNum = Math.floor(Math.random() * galleryArray.length);

let numberAgain = galleryArray[randomNum]; 

if(gallery.includes(randomNum)){

    console.log("nuthin?")

}

else{
    
    gallery.push(galleryArray[randomNum])

}

let galleryString = galleryArray.join(" ");
    console.log(galleryString);

}


/// 

/* ============================================================
   PIECE 1: THE DATA
   This is your coffee shop "database" — just a JavaScript array.
   Each coffee shop is an "object" with properties: region, city,
   name, description, and tags. To add a new shop later, copy one
   of these blocks and change the values.
   ============================================================ */
const coffeeShops = [
  {
    region: "North America",
    city: "Seattle",
    name: "Pike Place Roasters",
    description: "A cozy roastery near the market, known for its single-origin pour-overs.",
    tags: ["Pour-over", "Wi-Fi", "Pet-friendly"]
  },
  {
    region: "North America",
    city: "Seattle",
    name: "Rainy Day Espresso",
    description: "Small espresso bar with house-made oat milk syrups.",
    tags: ["Espresso", "Vegan options"]
  },
  {
    region: "North America",
    city: "Toronto",
    name: "Maple & Bean",
    description: "Bright, plant-filled cafe specializing in Canadian maple lattes.",
    tags: ["Latte art", "Study spot"]
  },
  {
    region: "Europe",
    city: "Paris",
    name: "Café de Flore",
    description: "Historic Left Bank cafe that's been serving coffee since 1887.",
    tags: ["Historic", "Outdoor seating"]
  },
  {
    region: "Europe",
    city: "Rome",
    name: "Sant'Eustachio Il Caffè",
    description: "Famous for its foamy, secretly-whipped espresso.",
    tags: ["Espresso", "Local favorite"]
  },
  {
    region: "Asia",
    city: "Tokyo",
    name: "Kissaten Kohi",
    description: "Old-school Japanese coffeehouse with siphon-brewed coffee.",
    tags: ["Siphon brew", "Quiet"]
  },
  {
    region: "Asia",
    city: "Seoul",
    name: "Hangang Brew",
    description: "Riverside cafe with floor-to-ceiling windows and cold brew on tap.",
    tags: ["Cold brew", "Scenic view"]
  }
];


/* ============================================================
   PIECE 2: GRABBING THE HTML ELEMENTS
   "document.getElementById" finds an element on the page by its
   id attribute (the ids we set in index.html: region-select,
   city-select, shop-select, details-panel).
   We save each one in a variable so we can read/change it easily.
   ============================================================ */
const regionSelect = document.getElementById("region-select");
const citySelect = document.getElementById("city-select");
const shopSelect = document.getElementById("shop-select");
const detailsPanel = document.getElementById("details-panel");


/* ============================================================
   PIECE 3: FILL IN DROPDOWN 1 (REGIONS) WHEN THE PAGE LOADS
   ============================================================ */

// Get every region from our data, with no duplicates.
// "map" pulls out just the region from each shop.
// "new Set" automatically removes duplicate values.
// "[...Set]" turns it back into a normal array.
const uniqueRegions = [...new Set(coffeeShops.map(shop => shop.region))];

// For each region, create an <option> element and add it to the dropdown.
uniqueRegions.forEach(region => {
  const option = document.createElement("option"); // make a new <option> tag
  option.value = region;                            // its value (used in code)
  option.textContent = region;                      // its visible text
  regionSelect.appendChild(option);                 // add it into the <select>
});


/* ============================================================
   PIECE 4: RESPOND TO USER CHOICES
   "addEventListener('change', ...)" runs a function every time
   the user picks a new option in that dropdown.
   ============================================================ */

// --- When the REGION changes ---
regionSelect.addEventListener("change", () => {
  const selectedRegion = regionSelect.value;

  // Reset the city and shop dropdowns every time the region changes,
  // so old, no-longer-relevant options don't stick around.
  resetDropdown(citySelect, "-- Select a City --");
  resetDropdown(shopSelect, "-- Select a City First --");
  clearDetails();

  if (!selectedRegion) {
    citySelect.disabled = true;
    return; // stop here if they picked the blank "-- Select --" option
  }

  // Find every city that belongs to the selected region, no duplicates.
  const citiesInRegion = [...new Set(
    coffeeShops
      .filter(shop => shop.region === selectedRegion) // keep only matching shops
      .map(shop => shop.city)                          // pull out just the city
  )];

  citiesInRegion.forEach(city => {
    const option = document.createElement("option");
    option.value = city;
    option.textContent = city;
    citySelect.appendChild(option);
  });

  citySelect.disabled = false; // now the user is allowed to use it
});

// --- When the CITY changes ---
citySelect.addEventListener("change", () => {
  const selectedRegion = regionSelect.value;
  const selectedCity = citySelect.value;

  resetDropdown(shopSelect, "-- Select a Shop --");
  clearDetails();

  if (!selectedCity) {
    shopSelect.disabled = true;
    return;
  }

  // Find every shop that matches BOTH the selected region and city.
  const shopsInCity = coffeeShops.filter(
    shop => shop.region === selectedRegion && shop.city === selectedCity
  );

  shopsInCity.forEach(shop => {
    const option = document.createElement("option");
    option.value = shop.name;
    option.textContent = shop.name;
    shopSelect.appendChild(option);
  });

  shopSelect.disabled = false;
});

// --- When the SHOP changes ---
shopSelect.addEventListener("change", () => {
  const selectedShopName = shopSelect.value;

  if (!selectedShopName) {
    clearDetails();
    return;
  }

  // Find the one shop object matching the selected name.
  const shop = coffeeShops.find(shop => shop.name === selectedShopName);

  showDetails(shop);
});


/* ============================================================
   HELPER FUNCTIONS
   Small reusable functions called above, so we don't repeat code.
   ============================================================ */

// Empties out a dropdown and puts back a single placeholder option.
function resetDropdown(selectElement, placeholderText) {
  selectElement.innerHTML = `<option value="">${placeholderText}</option>`;
  selectElement.disabled = true;
}

// Clears the details panel back to its placeholder message.
function clearDetails() {
  detailsPanel.innerHTML = `<p class="placeholder-text">Select a region, city, and coffee shop above to see details here.</p>`;
}

// Builds and displays the HTML for a selected coffee shop.
function showDetails(shop) {
  detailsPanel.innerHTML = `
    <h2>${shop.name}</h2>
    <p class="shop-meta">${shop.city}, ${shop.region}</p>
    <p class="shop-description">${shop.description}</p>
    <div class="shop-tags">
      ${shop.tags.map(tag => `<span class="tag">${tag}</span>`).join("")}
    </div>
  `;
}

// WHERE

//SRC's of all images you want to use
const sectionsARR = ["img/SnappyRunners.jpeg", "img/NARC.jpeg", "img/AncoatRunClub.jpeg", "img/MileShyClub.jpeg"];
  
// IDS of the section tags in html
const sectionIDs = ["html/SnappyRunners.html", "html/NARC.html", "html/AncoatRunClub.html", "html/MileShyClub.html"];

//Stores the places randomly selected to show on website 
let showSectionsARR = [];

//=================================================================================

//WHAT DO - Randomize IMGS and show them in HTML

//Randomly selects 3 imgs to show on website
function randomize() {
  // showSectionsARR = [];


    for(let i = 0; i< 6;i++){


    let randomNum = Math.floor(Math.random() * sectionIDs.length);

    let placeToPush = document.getElementById(sectionIDs[i]);


    //Checks if we have the place already
  //   if (showSectionsARR.includes(placeToPush)) {
  //       //if we do we don't add it to our array
  //     console.log("oopsis");
  //   } 
  //   else {
  //       //if its not there already then we add it
  //     showSectionsARR.push(placeToPush);
  //   }
  //  }
  placeToPush.classList.add('col'+ randomNum);
  let placestring = showSectionsARR.join(" ");
  console.log(placestring);
    }


  /*
if most recent showSectionsARR IS SAME as placeARR[randomNum]
remove rerool

*/
}

//Finds <img> tags in HTML
//Put the random SRCS in each tag
// function findImage() {
//   randomize();

// //showSectionsARR = ["WWW.png", "NARC - Team Pic.jpeg", "internet.png"];
// let sectionLocation = document.getElementById("main")

// for(let i = 0; i < 9;i++){
// let newSection = document.createElement('RunClub');
// newSection.id = "RunClub" + i
// sectionIDs.push("RunClub"+ i)
// sectionLocation.appendChild(newSection);
// }

//  for (let i = 0; i < sectionIDs.length; i++) 
//   {
//     //0 1 2 3 4 
//     //htmlIDs[]]
//     //find location
//     //WHERE 
//     let showID = document.getElementById(sectionIDs[i]);  //first time = <img id = "img1">
//     console.log(showID);
//     showID = showSectionsARR[i]; //set <img> SRC to the random place
//   }
// }
//WHEN
// We have an 'onload' in body on html 














// AI Generated code below//
// THIS IS FOR THE NEW MAP
// var map = L.map('map').setView([51.505, -0.09], 13);

// -----------------------------
// Randomized Gallery Renderer
// -----------------------------
// Picks 6 unique images from a collection (default 20) and
// injects them into a container with id "gallery" each page load.

// Use the existing `sectionsARR` if you populate it above; otherwise
// the script will fall back to a set of placeholder image paths.
const GALLERY_COUNT = 6;
const FALLBACK_IMAGE_COUNT = 20;

const GALLERY_IMAGES = (sectionsARR && sectionsARR.length > 0)
  ? sectionsARR
  : Array.from({ length: FALLBACK_IMAGE_COUNT }, (_, i) => `img/gallery${i + 1}.jpg`);

function shuffleArray(arr) {
  // Fisher-Yates shuffle (non-destructive)
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandomImages(images, count) {
  if (!Array.isArray(images) || images.length === 0) return [];
  const n = Math.min(count, images.length);
  const shuffled = shuffleArray(images);
  return shuffled.slice(0, n);
}

function populateGallery(containerId = 'gallery', images = GALLERY_IMAGES, count = GALLERY_COUNT) {
  const container = document.getElementById(containerId);
  if (!container) {
    // nothing to render into
    return;
  }

  const picks = pickRandomImages(images, count);
  container.innerHTML = '';

  picks.forEach((src, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'gallery-cell';

    const img = document.createElement('img');
    img.src = src;
    img.alt = `Gallery image ${idx + 1}`;
    img.className = 'gallery-item';

    wrapper.appendChild(img);
    container.appendChild(wrapper);
  });
}

// Auto-run on DOM loaded so each page load shows a fresh set.
window.addEventListener('DOMContentLoaded', () => {
  populateGallery('gallery', GALLERY_IMAGES, GALLERY_COUNT);
});

// End of randomized gallery implementation



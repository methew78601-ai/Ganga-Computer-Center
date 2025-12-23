document.addEventListener("DOMContentLoaded", () => {

  const searchInput = document.querySelector(".search-input");
  const chips = document.querySelectorAll(".chip");
  const sortSelect = document.querySelector(".sort-select");
  const cards = document.querySelectorAll(".popular-card");
  const grid = document.querySelector(".popular-grid");
  const resultCount = document.querySelector(".result-count");
  const noResults = document.querySelector(".no-results");

  let activeCategory = "all";

  /* =========================
     SEARCH + FILTER
     ========================= */
  function filterCourses() {
    const searchText = searchInput.value.toLowerCase().trim();
    let visibleCount = 0;

    cards.forEach(card => {

      const title = card.querySelector(".popular-title")
        .innerText.toLowerCase();

      const desc = card.querySelector(".popular-desc")
        .innerText.toLowerCase();

      const category = card.dataset.category;

      const matchSearch =
        title.includes(searchText) ||
        desc.includes(searchText);

      const matchCategory =
        activeCategory === "all" || category === activeCategory;

      if (matchSearch && matchCategory) {
        card.style.display = "flex";
        visibleCount++;
      } else {
        card.style.display = "none";
      }
    });

    resultCount.innerText = `${visibleCount} course(s) found`;
    noResults.style.display = visibleCount === 0 ? "block" : "none";
  }

  /* =========================
     CATEGORY FILTER
     ========================= */
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      chips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");

      activeCategory = chip.dataset.filter;
      filterCourses();
    });
  });

  /* =========================
     SEARCH INPUT
     ========================= */
  searchInput.addEventListener("input", filterCourses);

  /* =========================
     SORTING
     ========================= */
  sortSelect.addEventListener("change", () => {

    const cardsArray = Array.from(cards);
    let sortedCards;

    if (sortSelect.value === "rating") {
      sortedCards = cardsArray.sort((a, b) =>
        getRating(b) - getRating(a)
      );
    }
    else if (sortSelect.value === "price_low") {
      sortedCards = cardsArray.sort((a, b) =>
        getPrice(a) - getPrice(b)
      );
    }
    else if (sortSelect.value === "price_high") {
      sortedCards = cardsArray.sort((a, b) =>
        getPrice(b) - getPrice(a)
      );
    }
    else {
      sortedCards = cardsArray;
    }

    sortedCards.forEach(card => grid.appendChild(card));
  });

  /* =========================
     HELPERS
     ========================= */
  function getPrice(card) {
    return Number(
      card.querySelector(".popular-price")
        .innerText.replace("$", "")
    );
  }

  function getRating(card) {
    return Number(
      card.querySelector(".popular-rating span")
        .innerText
    );
  }

  /* =========================
     INITIAL LOAD
     ========================= */
  filterCourses();
});

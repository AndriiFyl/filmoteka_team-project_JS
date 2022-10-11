import { loadingSpinnerToggle } from "../interface/spinner";
import { fetchMovieDetailsById } from "../services/fetch";
import { scrollableBody } from "../helpers";
import { appendToStorage, removeKeyFromStorage, saveToStorage } from "../services/storage";
import { getQueuedFromLocalStorage, getWatchedFromLocalStorage } from "../library/library";
import { deattachTrailer, initTrailer } from "./trailer";

// Blank image
import blankImage from "../../images/no-image.svg";

// Items in local storage
const WATCHED_STORE = "watchedFilms";
const QUEUED_STORE = "queuedFilms";

let id;
// Obj for save to store
let filmInfoParsed;

// References to elements
const refs = {
        grid: document.querySelector(".movies-section__grid"),
        modalDetailOverlay: document.querySelector(".backdrop"),
        closeBtn: document.querySelector(".modal-detail__close-button"),
        posterImage: document.querySelector(".modal-detail__image"),
        title: document.querySelector(".modal-detail__title"),
        votesAVG: document.querySelector(".modal-detail__vote-avg"),
        votesCount: document.querySelector(".modal-detail__vote-count"),
        popularity: document.querySelector(".modal-detail__popularity"),
        orgTitle: document.querySelector(".modal-detail__org-title"),
        genres: document.querySelector(".modal-detail__genres"),
        article: document.querySelector(".modal-detail__article"),

        watchBtn: document.getElementById("watch-btn"),
        queueBtn: document.getElementById("queue-btn"),
};

// Init attaching
export default function initModalFilmDetails() {
        refs.grid.addEventListener("click", openMovieDetailModal);
}

// Join genres array to string
export function parseGenres(genres) {
        return genres.map((genre) => genre.name).join(", ");
}

async function openMovieDetailModal(e) {
        const filmCard = e.target;

        // Get video ID from data card
        id = filmCard.closest("div").getAttribute("data-id");

        // Return if no id
        if (!id) {
                return;
        }

        // Clear image for first
        refs.posterImage.setAttribute("src", blankImage);

        // Post req by id
        const filmInfo = await getMovieById(id);

        // Show modal
        refs.modalDetailOverlay.classList.toggle("is-hidden");

        // Attach clicks event on Modal (for close window)
        refs.modalDetailOverlay.addEventListener("click", closeModal);
        document.addEventListener("keydown", closeModal);

        // Hide scroll on body
        scrollableBody(false);

        // Export data
        const {
                title = "NO TITLE",
                original_title = "No original title",
                overview = "No overview...",
                popularity,
                release_date,
                vote_average,
                vote_count,
                poster_path,
                genres,
                videos: { results: trailersList },
        } = filmInfo;

        // Save temp object
        filmInfoParsed = {
                id,
                title,
                original_title,
                overview,
                popularity,
                release_date,
                genres,
                vote_average,
                vote_count,
                poster_path,
                videos: { results: trailersList },
        };

        // Init trailer of film
        initTrailer(trailersList);

        // Parse names of genres
        const genresStr = genres.length > 0 ? parseGenres(genres) : "No genres";

        // Title
        refs.title.innerText = title;

        // Poster image
        poster_path
                ? refs.posterImage.setAttribute(
                          "src",
                          `https://image.tmdb.org/t/p/w500${poster_path}`,
                  )
                : refs.posterImage.setAttribute("src", blankImage);

        // Original title
        refs.orgTitle.innerText = original_title || "NO TITLE";

        // Popularity
        refs.popularity.innerText = popularity ? popularity.toFixed(2) : "No info";

        // Genres
        refs.genres.innerText = genresStr || "No info";

        // Overview
        refs.article.innerText = overview || "No info";

        // Votes
        refs.votesCount.innerText = vote_count || "0";

        // Avg votes
        refs.votesAVG.innerText = vote_average ? vote_average.toFixed(1) : "0";

        // Check statuses
        setButtonStatus("all", checkLibrary(id));

        // Attach click events on buttons
        refs.watchBtn.addEventListener("click", handleChangeStatus);
        refs.queueBtn.addEventListener("click", handleChangeStatus);
}

// On click buttons events
const handleChangeStatus = (e) => {
        const { watched, queued } = checkLibrary(id);

        // Watched button
        if (e.target.id == "watch-btn") {
                if (watched.bool) {
                        removeKeyFromStorage(WATCHED_STORE, watched.index);
                } else {
                        appendToStorage(WATCHED_STORE, filmInfoParsed);
                }
                setButtonStatus("watch-btn", { watched, queued });
        }

        // Queued button
        if (e.target.id == "queue-btn") {
                if (queued.bool) {
                        removeKeyFromStorage(QUEUED_STORE, queued.index);
                } else {
                        appendToStorage(QUEUED_STORE, filmInfoParsed);
                }
                setButtonStatus("queue-btn", { watched, queued });
        }
};

// Change style of buttons
function setButtonStatus(btn, { watched, queued }) {
        switch (btn) {
                case "watch-btn":
                        refs.watchBtn.innerText = watched.bool ? "Add to Watched" : "Unwatched";
                        break;
                case "queue-btn":
                        refs.queueBtn.innerText = queued.bool ? "Add to Queue" : "Unqueued";
                        break;
                default:
                        refs.watchBtn.innerText = !watched.bool ? "Add to Watched" : "Unwatched";
                        refs.queueBtn.innerText = !queued.bool ? "Add to Queue" : "Unqueued";
                        break;
        }
}

// Checking statuses
function checkLibrary(id) {
        let watchedFilms = getWatchedFromLocalStorage(WATCHED_STORE);
        let queuedFilms = getQueuedFromLocalStorage(QUEUED_STORE);

        if (watchedFilms === null || watchedFilms === undefined) {
                saveToStorage(WATCHED_STORE, []);
                watchedFilms = [];
        }

        if (queuedFilms === null || queuedFilms === undefined) {
                saveToStorage(QUEUED_STORE, []);
                queuedFilms = [];
        }

        let indexWatched = watchedFilms.findIndex((film) => film.id == id);
        let indexQueued = queuedFilms.findIndex((queued) => queued.id == id);

        const isWatched = Boolean(indexWatched + 1);
        const isQueued = Boolean(indexQueued + 1);

        return {
                watched: { bool: isWatched, index: indexWatched },
                queued: { bool: isQueued, index: indexQueued },
        };
}

// Close modal
function closeModal(e) {
        // Keyboard event
        if (e.type === "keydown") {
                // Not escape
                if (e.keyCode !== 27) {
                        return;
                }
        }

        // Mouse event
        else {
                // Closest parent is "button" and class is "backdrop"
                if (!e.target.closest("button") && !e.target.classList.contains("backdrop")) {
                        return;
                }

                // Not close buttons
                if (e.target.classList.contains("modal-detail__btn")) return;
        }

        // Toggle hidden class
        refs.modalDetailOverlay.classList.toggle("is-hidden");

        // Show scroll on body
        scrollableBody(true);

        // Deattach keyboard and mouse events
        refs.modalDetailOverlay.removeEventListener("click", closeModal);
        document.removeEventListener("keydown", closeModal);

        // Deattach buttons events
        refs.watchBtn.removeEventListener("click", handleChangeStatus);
        refs.queueBtn.removeEventListener("click", handleChangeStatus);

        // Deattach trailer
        deattachTrailer();
}

// Fetch movie by ID
async function getMovieById(id) {
        try {
                // spinner
                loadingSpinnerToggle();
                await new Promise((resolve) => setTimeout(resolve, 300));

                // Send http req, trying get the pictures
                const response = await fetchMovieDetailsById(id);

                // Check statuses
                if (response.status !== 200) {
                        throw new Error(response.status);
                }

                if (response.data === undefined) {
                        throw new Error("Incorrect data");
                }

                // Get JSON of pictures
                const dataJSON = response.data;

                // Hide loading spinner
                loadingSpinnerToggle();

                return dataJSON;
        } catch (error) {
                console.log(error);
        }
}

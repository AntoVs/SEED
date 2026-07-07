(function () {
  "use strict";

  const STORAGE_KEY = "zeroPointsQuizManagerState";
  const STARTING_SCORE = 1000;
  const CATEGORIES = ["Tech", "Sports", "Rajagiri", "Entertainment"];
  const POINTS = [20, 40, 60, 80];
  const SCORE_ADJUSTMENTS = [20, -20, 40, -40, 60, -60, 80, -80];

  const elements = {
    body: document.body,
    quizBoard: document.getElementById("quizBoard"),
    boardProgress: document.getElementById("boardProgress"),
    leaderboardList: document.getElementById("leaderboardList"),
    currentTeamLabel: document.getElementById("currentTeamLabel"),
    currentRoundLabel: document.getElementById("currentRoundLabel"),
    darkModeToggle: document.getElementById("darkModeToggle"),
    teamForm: document.getElementById("teamForm"),
    teamNameInput: document.getElementById("teamNameInput"),
    teamMembersInput: document.getElementById("teamMembersInput"),
    teamSelect: document.getElementById("teamSelect"),
    editTeamNameInput: document.getElementById("editTeamNameInput"),
    saveTeamButton: document.getElementById("saveTeamButton"),
    removeTeamButton: document.getElementById("removeTeamButton"),
    resetScoresButton: document.getElementById("resetScoresButton"),
    resetQuizButton: document.getElementById("resetQuizButton"),
    nextTeamButton: document.getElementById("nextTeamButton"),
    previousTeamButton: document.getElementById("previousTeamButton"),
    scoreAdjustmentButtons: document.getElementById("scoreAdjustmentButtons"),
    answerModal: document.getElementById("answerModal"),
    closeAnswerModal: document.getElementById("closeAnswerModal"),
    questionMeta: document.getElementById("questionMeta"),
    answerModalTitle: document.getElementById("answerModalTitle"),
    attemptTeamSelect: document.getElementById("attemptTeamSelect"),
    correctButton: document.getElementById("correctButton"),
    wrongButton: document.getElementById("wrongButton"),
    passButton: document.getElementById("passButton"),
    confirmModal: document.getElementById("confirmModal"),
    confirmModalMessage: document.getElementById("confirmModalMessage"),
    confirmActionButton: document.getElementById("confirmActionButton"),
    cancelConfirmButton: document.getElementById("cancelConfirmButton"),
    cancelConfirmIcon: document.getElementById("cancelConfirmIcon"),
    toastRegion: document.getElementById("toastRegion"),
    storageStatus: document.getElementById("storageStatus")
  };

  let state = loadState();
  let selectedQuestion = null;
  let pendingConfirmAction = null;
  let previousLeaderboardOrder = [];
  let storageAvailable = true;

  // State creation and persistence
  function createDefaultState() {
    return {
      teams: [
        createTeam("Team A", ""),
        createTeam("Team B", ""),
        createTeam("Team C", ""),
        createTeam("Team D", "")
      ],
      currentTeamIndex: 0,
      round: 1,
      completedQuestions: [],
      darkMode: false
    };
  }

  function createTeam(name, members) {
    return {
      id: createId(),
      name,
      members,
      score: STARTING_SCORE
    };
  }

  function loadState() {
    try {
      const savedState = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!savedState || !Array.isArray(savedState.teams)) {
        return createDefaultState();
      }

      return {
        teams: savedState.teams.map((team) => ({
          id: team.id || createTeam(team.name || "Team", "").id,
          name: team.name || "Team",
          members: team.members || "",
          score: Number.isFinite(Number(team.score)) ? Number(team.score) : STARTING_SCORE
        })),
        currentTeamIndex: Number.isInteger(savedState.currentTeamIndex) ? savedState.currentTeamIndex : 0,
        round: Number.isInteger(savedState.round) ? savedState.round : 1,
        completedQuestions: Array.isArray(savedState.completedQuestions) ? savedState.completedQuestions : [],
        darkMode: Boolean(savedState.darkMode)
      };
    } catch (error) {
      return createDefaultState();
    }
  }

  function saveState() {
    if (!storageAvailable) {
      return;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      elements.storageStatus.textContent = "Local storage enabled";
    } catch (error) {
      storageAvailable = false;
      elements.storageStatus.textContent = "Local storage unavailable";
      showToast("Local storage is unavailable. Changes will last for this session only.");
    }
  }

  // Rendering
  function render(shouldPersist = true) {
    normalizeCurrentTeamIndex();
    renderTheme();
    renderStatus();
    renderQuizBoard();
    renderTeamControls();
    renderLeaderboard();
    updateActionStates();
    if (shouldPersist) {
      saveState();
    }
  }

  function renderTheme() {
    elements.body.classList.toggle("dark-mode", state.darkMode);
    elements.darkModeToggle.setAttribute("aria-pressed", String(state.darkMode));
  }

  function renderStatus() {
    const currentTeam = getCurrentTeam();
    elements.currentTeamLabel.textContent = currentTeam ? currentTeam.name : "No teams";
    elements.currentRoundLabel.textContent = `Round ${state.round}`;
  }

  function renderQuizBoard() {
    const fragment = document.createDocumentFragment();
    const completedCount = state.completedQuestions.length;

    CATEGORIES.forEach((category) => {
      const column = document.createElement("div");
      column.className = "category-column";

      const title = document.createElement("div");
      title.className = "category-title";
      title.textContent = category;
      column.appendChild(title);

      POINTS.forEach((points) => {
        const questionId = getQuestionId(category, points);
        const button = document.createElement("button");
        button.className = "question-card";
        button.type = "button";
        button.textContent = points;
        button.dataset.questionId = questionId;
        button.dataset.category = category;
        button.dataset.points = String(points);
        button.disabled = state.completedQuestions.includes(questionId);
        button.setAttribute("aria-label", `${category} for ${points} points`);
        column.appendChild(button);
      });

      fragment.appendChild(column);
    });

    elements.quizBoard.replaceChildren(fragment);
    elements.boardProgress.textContent = `${completedCount} / ${CATEGORIES.length * POINTS.length} completed`;
  }

  function renderTeamControls() {
    const teamOptions = state.teams.map((team, index) => createOption(team.id, `${index + 1}. ${team.name}`));
    const attemptOptions = state.teams.map((team) => createOption(team.id, team.name));

    elements.teamSelect.replaceChildren(...teamOptions);
    elements.attemptTeamSelect.replaceChildren(...attemptOptions);

    const selectedTeam = getSelectedTeamForControls();
    if (selectedTeam) {
      elements.teamSelect.value = selectedTeam.id;
      elements.editTeamNameInput.value = selectedTeam.name;
    } else {
      elements.editTeamNameInput.value = "";
    }

    const currentTeam = getCurrentTeam();
    if (currentTeam) {
      elements.attemptTeamSelect.value = currentTeam.id;
    }
  }

  function renderLeaderboard() {
    const sortedTeams = getSortedTeams();
    const fragment = document.createDocumentFragment();

    sortedTeams.forEach((team, index) => {
      const item = document.createElement("li");
      item.className = "leaderboard-item";
      item.dataset.teamId = team.id;
      if (team.id === getCurrentTeam()?.id) {
        item.classList.add("is-current");
      }

      const previousIndex = previousLeaderboardOrder.indexOf(team.id);
      if (previousIndex !== -1 && previousIndex !== index) {
        item.style.transform = previousIndex > index ? "translateY(8px)" : "translateY(-8px)";
        requestAnimationFrame(() => {
          item.style.transform = "translateY(0)";
        });
      }

      const rank = document.createElement("span");
      rank.className = "rank";
      rank.textContent = String(index + 1);

      const details = document.createElement("div");
      details.className = "team-details";
      const name = document.createElement("strong");
      name.textContent = team.name;
      const members = document.createElement("span");
      members.textContent = team.members || "Members not listed";
      details.append(name, members);

      const score = document.createElement("span");
      score.className = "score";
      score.textContent = String(team.score);

      item.append(rank, details, score);
      fragment.appendChild(item);
    });

    elements.leaderboardList.replaceChildren(fragment);
    previousLeaderboardOrder = sortedTeams.map((team) => team.id);
  }

  function updateActionStates() {
    const hasTeams = state.teams.length > 0;
    [
      elements.teamSelect,
      elements.editTeamNameInput,
      elements.saveTeamButton,
      elements.removeTeamButton,
      elements.resetScoresButton,
      elements.nextTeamButton,
      elements.previousTeamButton
    ].forEach((element) => {
      element.disabled = !hasTeams;
    });

    elements.scoreAdjustmentButtons.querySelectorAll("button").forEach((button) => {
      button.disabled = !hasTeams;
    });
  }

  // Event wiring
  function bindEvents() {
    elements.quizBoard.addEventListener("click", handleQuestionClick);
    elements.teamForm.addEventListener("submit", handleAddTeam);
    elements.teamSelect.addEventListener("change", handleTeamSelectionChange);
    elements.saveTeamButton.addEventListener("click", handleSaveTeam);
    elements.removeTeamButton.addEventListener("click", handleRemoveTeam);
    elements.resetScoresButton.addEventListener("click", () => {
      openConfirm("Reset every team score back to 1000?", resetScores);
    });
    elements.resetQuizButton.addEventListener("click", () => {
      openConfirm("Reset quiz progress and clear saved question completion data?", resetQuiz);
    });
    elements.nextTeamButton.addEventListener("click", nextTeam);
    elements.previousTeamButton.addEventListener("click", previousTeam);
    elements.darkModeToggle.addEventListener("click", toggleDarkMode);
    elements.closeAnswerModal.addEventListener("click", closeAnswerModal);
    elements.correctButton.addEventListener("click", () => recordAnswer("correct"));
    elements.wrongButton.addEventListener("click", () => recordAnswer("wrong"));
    elements.passButton.addEventListener("click", () => recordAnswer("pass"));
    elements.confirmActionButton.addEventListener("click", confirmPendingAction);
    elements.cancelConfirmButton.addEventListener("click", closeConfirmModal);
    elements.cancelConfirmIcon.addEventListener("click", closeConfirmModal);
    document.addEventListener("keydown", handleKeyboardShortcuts);
  }

  function buildScoreButtons() {
    const buttons = SCORE_ADJUSTMENTS.map((adjustment) => {
      const button = document.createElement("button");
      button.className = `button ${adjustment > 0 ? "button-warning" : "button-success"}`;
      button.type = "button";
      button.textContent = adjustment > 0 ? `+${adjustment}` : String(adjustment);
      button.addEventListener("click", () => adjustSelectedTeamScore(adjustment));
      return button;
    });

    elements.scoreAdjustmentButtons.replaceChildren(...buttons);
  }

  // User actions
  function handleQuestionClick(event) {
    const card = event.target.closest(".question-card");
    if (!card || card.disabled) {
      return;
    }

    if (!state.teams.length) {
      showToast("Add at least one team before recording an answer.");
      return;
    }

    selectedQuestion = {
      id: card.dataset.questionId,
      category: card.dataset.category,
      points: Number(card.dataset.points)
    };

    const currentTeam = getCurrentTeam();
    elements.questionMeta.textContent = `${selectedQuestion.category} / ${selectedQuestion.points}`;
    elements.answerModalTitle.textContent = "Record Attempt";
    elements.attemptTeamSelect.value = currentTeam.id;
    elements.answerModal.showModal();
  }

  function handleAddTeam(event) {
    event.preventDefault();
    const name = elements.teamNameInput.value.trim();
    const members = elements.teamMembersInput.value.trim();

    if (!name) {
      showToast("Team name is required.");
      return;
    }

    state.teams.push(createTeam(name, members));
    elements.teamForm.reset();
    showToast(`${name} added with ${STARTING_SCORE} points.`);
    render();
  }

  function handleTeamSelectionChange() {
    const selectedTeam = getSelectedTeamForControls();
    elements.editTeamNameInput.value = selectedTeam ? selectedTeam.name : "";
  }

  function handleSaveTeam() {
    const selectedTeam = getSelectedTeamForControls();
    const newName = elements.editTeamNameInput.value.trim();

    if (!selectedTeam || !newName) {
      showToast("Select a team and enter a valid name.");
      return;
    }

    selectedTeam.name = newName;
    showToast("Team name updated.");
    render();
  }

  function handleRemoveTeam() {
    const selectedTeam = getSelectedTeamForControls();
    if (!selectedTeam) {
      return;
    }

    openConfirm(`Remove ${selectedTeam.name} from the quiz?`, () => {
      const removedIndex = state.teams.findIndex((team) => team.id === selectedTeam.id);
      state.teams = state.teams.filter((team) => team.id !== selectedTeam.id);
      if (removedIndex <= state.currentTeamIndex) {
        state.currentTeamIndex -= 1;
      }
      normalizeCurrentTeamIndex();
      showToast(`${selectedTeam.name} removed.`);
      render();
    });
  }

  function recordAnswer(result) {
    if (!selectedQuestion) {
      return;
    }

    const team = state.teams.find((item) => item.id === elements.attemptTeamSelect.value);
    if (!team) {
      showToast("Select a team for the attempt.");
      return;
    }

    if (result === "correct") {
      team.score -= selectedQuestion.points;
      completeSelectedQuestion();
      showToast(`${team.name} answered correctly.`);
      rotateAfterAttempt(team.id);
    }

    if (result === "wrong") {
      team.score += selectedQuestion.points;
      completeSelectedQuestion();
      showToast(`${team.name} answered incorrectly.`);
      rotateAfterAttempt(team.id);
    }

    if (result === "pass") {
      showToast(`${team.name} passed. Question remains available.`);
      rotateAfterAttempt(team.id);
    }

    closeAnswerModal();
    render();
  }

  function completeSelectedQuestion() {
    if (!state.completedQuestions.includes(selectedQuestion.id)) {
      state.completedQuestions.push(selectedQuestion.id);
    }
  }

  function rotateAfterAttempt(teamId) {
    const teamIndex = state.teams.findIndex((team) => team.id === teamId);
    if (teamIndex !== -1) {
      state.currentTeamIndex = teamIndex;
    }
    nextTeam(false);
  }

  function nextTeam(shouldRender = true) {
    if (!state.teams.length) {
      return;
    }

    state.currentTeamIndex += 1;
    if (state.currentTeamIndex >= state.teams.length) {
      state.currentTeamIndex = 0;
      state.round += 1;
    }

    if (shouldRender) {
      showToast(`Turn: ${getCurrentTeam().name}`);
      render();
    }
  }

  function previousTeam() {
    if (!state.teams.length) {
      return;
    }

    state.currentTeamIndex -= 1;
    if (state.currentTeamIndex < 0) {
      state.currentTeamIndex = state.teams.length - 1;
      state.round = Math.max(1, state.round - 1);
    }

    showToast(`Turn: ${getCurrentTeam().name}`);
    render();
  }

  function adjustSelectedTeamScore(adjustment) {
    const selectedTeam = getSelectedTeamForControls();
    if (!selectedTeam) {
      return;
    }

    selectedTeam.score += adjustment;
    showToast(`${selectedTeam.name}: ${adjustment > 0 ? "+" : ""}${adjustment}`);
    render();
  }

  function resetScores() {
    state.teams.forEach((team) => {
      team.score = STARTING_SCORE;
    });
    showToast("Scores reset to 1000.");
    render();
  }

  function resetQuiz() {
    state = createDefaultState();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      storageAvailable = false;
      elements.storageStatus.textContent = "Local storage unavailable";
    }
    showToast("Quiz progress reset.");
    render(false);
  }

  function toggleDarkMode() {
    state.darkMode = !state.darkMode;
    render();
  }

  // Modal and notification helpers
  function openConfirm(message, action) {
    pendingConfirmAction = action;
    elements.confirmModalMessage.textContent = message;
    elements.confirmModal.showModal();
  }

  function confirmPendingAction() {
    if (pendingConfirmAction) {
      pendingConfirmAction();
    }
    closeConfirmModal();
  }

  function closeConfirmModal() {
    pendingConfirmAction = null;
    elements.confirmModal.close();
  }

  function closeAnswerModal() {
    selectedQuestion = null;
    elements.answerModal.close();
  }

  function handleKeyboardShortcuts(event) {
    const activeTag = document.activeElement.tagName.toLowerCase();
    const isTyping = ["input", "textarea", "select"].includes(activeTag);

    if (event.key === "Escape") {
      closeOpenModal();
      return;
    }

    if (isTyping) {
      return;
    }

    if (event.key === "ArrowRight") {
      nextTeam();
    }

    if (event.key === "ArrowLeft") {
      previousTeam();
    }

    if (event.ctrlKey && event.key.toLowerCase() === "r") {
      event.preventDefault();
      openConfirm("Reset quiz progress and clear saved question completion data?", resetQuiz);
    }
  }

  function closeOpenModal() {
    if (elements.answerModal.open) {
      closeAnswerModal();
    }
    if (elements.confirmModal.open) {
      closeConfirmModal();
    }
  }

  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    elements.toastRegion.appendChild(toast);

    window.setTimeout(() => {
      toast.remove();
    }, 2800);
  }

  function createOption(value, text) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    return option;
  }

  // Shared utilities
  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `team-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function getQuestionId(category, points) {
    return `${category.toLowerCase()}-${points}`;
  }

  function getCurrentTeam() {
    return state.teams[state.currentTeamIndex] || null;
  }

  function getSelectedTeamForControls() {
    return state.teams.find((team) => team.id === elements.teamSelect.value) || state.teams[0] || null;
  }

  function getSortedTeams() {
    return [...state.teams].sort((first, second) => {
      if (first.score !== second.score) {
        return first.score - second.score;
      }
      return first.name.localeCompare(second.name);
    });
  }

  function normalizeCurrentTeamIndex() {
    if (!state.teams.length) {
      state.currentTeamIndex = 0;
      return;
    }

    if (state.currentTeamIndex < 0) {
      state.currentTeamIndex = 0;
    }

    if (state.currentTeamIndex >= state.teams.length) {
      state.currentTeamIndex = state.teams.length - 1;
    }
  }

  function init() {
    buildScoreButtons();
    bindEvents();
    render();
  }

  init();
})();

$(async function () {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $favoritedArticles = $("#favorited-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");

  const $addStoryForm = $("#submit-form");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  await checkIfLoggedIn();

  /**
   * Event listener for adding story.
   */
  $addStoryForm.on("submit", async function (evt) {
    evt.preventDefault();

    const author = $("#author").val();
    const title = $("#title").val();
    const url = $("#url").val();

    const newStory = { author, title, url };

    storyList.addStory(currentUser, newStory);

    console.log("New Story Submitted!");
    $addStoryForm.trigger("reset");
  });

  /**
   * Event listener for favoriting / unfavoriting story.
   *
   */
  $("body").on("click", "#favorite", async function (evt) {
    // get story ID
    const favoritedStoryId = $(evt.target).parent().attr("id");

    // Add favorite using API and update current user
    const updatedUser = await currentUser.addFavorite(favoritedStoryId);
    currentUser = updatedUser;

    // re-render stories
    hideElements();
    await generateStories();
    generateFavorites();

    $allStoriesList.show();
    $favoritedArticles.show();
  });

  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */
  $loginForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */
  $createAccountForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  /**
   * Log Out Functionality
   */
  $navLogOut.on("click", function () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });

  /**
   * Event Handler for Clicking Login
   */
  $navLogin.on("click", function () {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
    $favoritedArticles.toggle();
  });

  /**
   * Event handler for Navigation to Homepage
   */
  $("body").on("click", "#nav-all", async function () {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */
  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showElements();
      generateFavorites();
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */
  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();
    $addStoryForm.slideToggle();

    // show elements
    generateFavorites();
    showElements();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */
  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }
  function generateFavorites() {
    // empty out that part of the page
    $favoritedArticles.empty();

    // loop through all of our favorites and generate HTML for them
    for (let favorite of currentUser.favorites) {
      const result = generateStoryHTML(favorite);
      $favoritedArticles.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */
  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        <span id="favorite" class="star">&star;</span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */
  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $favoritedArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
    ];
    elementsArr.forEach(($elem) => $elem.hide());
  }
  /* show all elements in elementsArr */
  function showElements() {
    $navLogin.hide();

    const elementsArr = [$favoritedArticles, $ownStories, $navLogOut];

    elementsArr.forEach(($elem) => $elem.show());
  }

  /* Pull the hostname from a URL */
  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */
  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});

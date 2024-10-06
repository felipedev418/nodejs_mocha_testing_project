function defineSpecsFor(apiRoot) {

  var todoRoot = apiRoot + '/todos/';
  var tagRoot = apiRoot + '/tags/';

  async function get(url, options) {
    var result = await getRaw(url, options);
    return await transformResponseToJson(result);
  }

  function getRaw(url, options) {
    return ajax("GET", url, options);
  }
  function post(url, data, options) {
    options = options || {};
    options.data = JSON.stringify(data);
    return ajax("POST", url, options);
  }
  async function postJson(url, data, options) {
    var result = await post(url, data, options);
    return await transformResponseToJson(result);
  }

  function patch(url, data, options) {
    options = options || {};
    options.data = JSON.stringify(data);
    return ajax("PATCH", url, options);
  }
  async function patchJson(url, data, options) {
    var result = await patch(url, data, options);
    return await transformResponseToJson(result);
  }

  function delete_(url, options) {
    return ajax("DELETE", url, options);
  }

  function postTodoRoot(data) {
    return postJson(todoRoot, data);
  }
  function getTodoRoot() {
    return get(todoRoot);
  }
  1
  function postTagRoot(data) {
    return postJson(tagRoot, data);
  }
  function getTagRoot() {
    return get(tagRoot);
  }

  function urlFromTodo(todo) { return todo.url; }
  function urlFromTag(tag) { return tag.url; }

  function idFromTodo(todo) { return todo.id; }
  function idFromTag(tag) { return tag.id; }


  describe("Todo-Tag-Backend API residing at " + apiRoot, function () {

    async function createFreshTodoAndGetItsUrl(params) {
      var postParams = _.defaults((params || {}), {
        title: "blah"
      });
      var todo = await postTodoRoot(postParams);
      return urlFromTodo(todo);
    };

    async function createFreshTagAndGetItsUrl(params) {
      var postParams = _.defaults((params || {}), {
        title: "bloh"
      });
      var tag = await postTagRoot(postParams);
      return urlFromTag(tag);
    };

    async function createFreshTodoAndGetItsId(params) {
      var postParams = _.defaults((params || {}), {
        title: "blah"
      });
      var todo = await postTodoRoot(postParams);
      return idFromTodo(todo);
    };

    async function createFreshTagAndGetItsId(params) {
      var postParams = _.defaults((params || {}), {
        title: "bloh"
      });
      var tag = await postTagRoot(postParams);
      return idFromTag(tag);
    };

    // TODOS

    describe("todo basics", function () {
      specify("the todo endpoint responds to a GET on the todos", async function () {
        var todos = await getRaw(todoRoot);
        expect(todos).to.exist;
      });

      specify("the todo endpoint responds to a POST with the todo which was posted to it", async function () {
        var todo = await postJson(todoRoot, { title: "a todo" });
        expect(todo).to.have.property("title", "a todo");
      });

      specify("the todos endpoint responds successfully to a DELETE", async function () {
        var deleteRoot = await delete_(todoRoot);
        expect(deleteRoot).to.be.fulfilled;
      });

      specify("after a DELETE the api root responds to a GET with a JSON representation of an empty array", async function () {
        await delete_(todoRoot);
        var todos = await getTodoRoot();
        expect(todos).to.have.length(0);
      });
    });

    describe("storing new todos by posting to the root url", function () {
      beforeEach(async function () {
        return await delete_(todoRoot);
      });

      it("adds a new todo to the list of todos at the root url", async function () {
        await postTodoRoot({ title: "walk the dog" });
        var todos = await getTodoRoot();
        expect(todos).to.have.length(1);
        expect(todos[0]).to.have.property("title", "walk the dog");
      });

      async function createTodoAndVerifyItLooksValidWith(verifyTodoExpectation) {
        var todo = await postTodoRoot({ title: "blah" });
        await verifyTodoExpectation(todo);
        var todos = await getTodoRoot();
        await verifyTodoExpectation(todos[0]);
      }

      it("sets up a new todo as initially not completed", async function () {
        await createTodoAndVerifyItLooksValidWith(async (todo) => {
          expect(todo).to.have.property("completed", false);
        });
      });

      it("each todo has an ID", async function () {
        var id = await createFreshTodoAndGetItsId();
        expect(id).to.exist;
      });

      it("each todo has an ID, which can be used to retrieve the todo", async function () {
        var id = await createFreshTodoAndGetItsId();
        var todo = await get(todoRoot + id);
        expect(todo).to.have.property('id', id);
      });

      it("each new todo has a url", async function () {
        await createTodoAndVerifyItLooksValidWith(async (todo) => {
          expect(todo).to.have.a.property("url").is.a("string");
        });
      });

      it("each new todo has a url, which returns a todo", async function () {
        var todo = await postTodoRoot({ title: "my todo" });
        var fetchedTodo = await get(todo.url);
        expect(fetchedTodo).to.have.property("title", "my todo");
      });
    });


    describe("working with an existing todo", function () {
      beforeEach(async function () {
        return await delete_(todoRoot);
      });

      it("can navigate from a list of todos to an individual todo via urls", async function () {
        await postTodoRoot({ title: "todo the first" });
        await postTodoRoot({ title: "todo the second" });
        var todos = await getTodoRoot();
        expect(todos).to.have.length(2);
        var todo = await get(urlFromTodo(todos[0]));
        expect(todo).to.have.property("title");
      });

      it("can change the todo's title by PATCHing to the todo's url", async function () {
        var url = await createFreshTodoAndGetItsUrl({ title: "initial title" });
        var patchedTodo = await patchJson(url, { title: "bathe the cat" });
        expect(patchedTodo).to.have.property("title", "bathe the cat");
      });

      it("can change the todo's completedness by PATCHing to the todo's url", async function () {
        var url = await createFreshTodoAndGetItsUrl();
        var patchedTodo = await patchJson(url, { completed: true });
        expect(patchedTodo).to.have.property("completed", true);
      });

      it("changes to a todo are persisted and show up when re-fetching the todo", async function () {

        var patchedTodo = async function() {
          var url = await createFreshTodoAndGetItsUrl();
          return await patchJson(url, { title: "changed title", completed: true });
        }

        function verifyTodosProperties(todo) {
          expect(todo).to.have.property("completed", true);
          expect(todo).to.have.property("title", "changed title");
        }

        var todo = await patchedTodo();
        var refetchedTodo = await get(todo.url);
        verifyTodosProperties(refetchedTodo);

        var todos = await getTodoRoot();
        expect(todos).to.have.length(1);
        verifyTodosProperties(todos[0]);
      });

      it("can delete a todo making a DELETE request to the todo's url", async function () {
        var url = await createFreshTodoAndGetItsUrl();
        await delete_(url);
        var todos = await get(todoRoot);
        expect(todos).to.be.empty;
      });
    });

    describe("tracking todo order", function () {
      it("can create a todo with an order field", async function () {
        var postResult = await postTodoRoot({ title: "blah", order: 523 });
        expect(postResult).to.have.property("order", 523);
      });

      it("can PATCH a todo to change its order", async function () {
        var url = await createFreshTodoAndGetItsUrl({ order: 10 });
        var patchedTodo = await patchJson(url, { order: 95 });
        expect(patchedTodo).to.have.property("order", 95);
      });

      it("remembers changes to a todo's order", async function () {
        var url = await createFreshTodoAndGetItsUrl({ order: 10 });
        var todo = await patchJson(url, { order: 95 });
        var refetchedTodo = await get(todo.url);
        expect(refetchedTodo).to.have.property("order", 95);
      });
    });


    // TAGS

    describe("tag basics", function () {
      specify("the tag endpoint responds to a GET on the tags", async function () {
        var tags = await getRaw(tagRoot);
        expect(tags).to.exist;
      });

      specify("the tag endpoint responds to a POST with the tag which was posted to it", async function () {
        var tag = await postJson(tagRoot, { title: "a tag" });
        expect(tag).to.have.property("title", "a tag");
      });

      specify("the tags endpoint responds successfully to a DELETE", async function () {
        var deleteRoot = await delete_(tagRoot);
        expect(deleteRoot).to.be.fulfilled;
      });

      specify("after a DELETE the api root responds to a GET with a JSON representation of an empty array", async function () {
        await delete_(tagRoot);
        var tags = await getTagRoot();
        expect(tags).to.have.length(0);
      });
    });

    describe("storing new tags by posting to the root url", function () {
      beforeEach(async function () {
        return await delete_(tagRoot);
      });

      it("adds a new tag to the list of tags at the root url", async function () {
        await postTagRoot({ title: "walk the dog" });
        var tags = await getTagRoot();
        expect(tags).to.have.length(1);
        expect(tags[0]).to.have.property("title", "walk the dog");
      });

      async function createTagAndVerifyItLooksValidWith(verifyTagExpectation) {
        var tag = await postTagRoot({ title: "blah" });
        await verifyTagExpectation(tag);
        var tags = await getTagRoot();
        await verifyTagExpectation(tags[0]);
      }

      it("each tag has an ID", async function () {
        var id = await createFreshTagAndGetItsId();
        expect(id).to.exist;
      });

      it("each tag has an ID, which can be used to retrieve the tag", async function () {
        var id = await createFreshTagAndGetItsId();
        var tag = await get(tagRoot + id);
        expect(tag).to.have.property('id', id);
      });

      it("each new tag has a url", async function () {
        await createTagAndVerifyItLooksValidWith(async (tag) => {
          expect(tag).to.have.a.property("url").is.a("string");
        });
      });

      it("each new tag has a url, which returns a tag", async function () {
        var tag = await postTagRoot({ title: "my tag" });
        var fetchedTag = await get(tag.url);
        expect(fetchedTag).to.have.property("title", "my tag");
      });
    });


    describe("working with an existing tag", function () {
      beforeEach(async function () {
        return await delete_(tagRoot);
      });

      it("can navigate from a list of tags to an individual tag via urls", async function () {
        await postTagRoot({ title: "tag the first" });
        await postTagRoot({ title: "tag the second" });
        var tags = await getTagRoot();
        expect(tags).to.have.length(2);
        var tag = await get(urlFromTag(tags[0]));
        expect(tag).to.have.property("title");
      });

      it("can change the tag's title by PATCHing to the tag's url", async function () {
        var url = await createFreshTagAndGetItsUrl({ title: "initial title" });
        var patchedTag = await patchJson(url, { title: "bathe the cat" });
        expect(patchedTag).to.have.property("title", "bathe the cat");
      });

      it("changes to a tag are persisted and show up when re-fetching the tag", async function () {

        var patchedTag = async function() {
          var url = await createFreshTagAndGetItsUrl();
          return await patchJson(url, { title: "changed title"});
        }

        function verifyTagsProperties(tag) {
          expect(tag).to.have.property("title", "changed title");
        }

        var tag = await patchedTag();
        var refetchedTag = await get(tag.url);
        verifyTagsProperties(refetchedTag);

        var tags = await getTagRoot();
        expect(tags).to.have.length(1);
        verifyTagsProperties(tags[0]);
      });

      it("can delete a tag making a DELETE request to the tag's url", async function () {
        var url = await createFreshTagAndGetItsUrl();
        await delete_(url);
        var tags = await get(tagRoot);
        expect(tags).to.be.empty;
      });
    });

    // TODOS' TAGS

    var createTodoAndAssociatedTag = async function(todoTitle, tagTitle){
      var resources = {};
      resources.todo = await postTodoRoot({title: todoTitle || "base todo"});
      resources.tag = await postTagRoot({title: tagTitle || "associated tag"});
      const result = await post(resources.todo.url + '/tags/', {id: resources.tag.id});
      return resources;
    };

    describe("todos' tags", function () {
      beforeEach(async function(){
        await delete_(todoRoot);
        await delete_(tagRoot);
      });

      it("can get a list of tags for each todo", async function () {
        var url = await createFreshTodoAndGetItsUrl();
        var todo = await get(url);
        expect(todo).to.have.property("tags").that.is.empty;
      });

      it("can create a todo, associate a tag to it, and get the tag id in the associated todo", async function () {
        var resources = await createTodoAndAssociatedTag();
        var todo = await get(resources.todo.url);
        console.log("todo", todo);
        expect(todo).to.have.property('tags');
        expect(todo.tags).to.have.length(1);
        expect(todo.tags[0]).to.have.property('id', resources.tag.id);
      });

      it("can create a todo, associate a tag to it, and retrieve the tag list by todo", async function () {
        var resources = await createTodoAndAssociatedTag(null, "joined tag");
        var tags = await get(resources.todo.url + '/tags/');
        expect(tags).to.have.length(1);
        expect(tags[0]).to.have.property('title', "joined tag");
      });

      it("can create a todo, associate tags to it and remove one tag association", async function () {
        var resources = await createTodoAndAssociatedTag();
        var newTagId = await createFreshTagAndGetItsId();
        await postJson(resources.todo.url + "/tags/", {id: newTagId});
        await delete_(resources.todo.url + "/tags/" + resources.tag.id);
        var tags = await get(resources.todo.url + "/tags/");
        expect(tags).to.have.length(1);
      });

      it("can create a todo, associate tags to it and remove all tag associations", async function () {
        var resources = await createTodoAndAssociatedTag();
        await delete_(resources.todo.url + "/tags/");
        var tags = await get(resources.todo.url + "/tags/");
        expect(tags).to.have.length(0);
      });
    });

    // TAGS' TODOS

    describe("tags' todos", function () {
      beforeEach(async function(){
        await delete_(todoRoot);
        await delete_(tagRoot);
      });

      it("can get a list of todos for each tag", async function () {
        var url = await createFreshTagAndGetItsUrl();
        var tag = await get(url);
        expect(tag).to.have.property("todos").that.is.empty;
      });

      it("can create a tag, associate a todo to it, and retrieve the todo list by tag", async function () {
        var resources = await createTodoAndAssociatedTag("joined todo", null);
        var todos = await get(resources.tag.url + "/todos/");
        console.log("Todos retrieved:", todos);
        expect(todos).to.have.length(1);
        expect(todos[0]).to.have.property('title', "joined todo");
      });
    });
  });



  function transformResponseToJson(data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      var wrapped = new Error("Could not parse response as JSON.");
      wrapped.stack = e.stack;
      throw wrapped;
    }
  }

  function interpretXhrFail(httpMethod, url, xhr) {
    var failureHeader = "\n\n" + httpMethod + " " + url + "\nFAILED\n\n";
    if (xhr.status == 0) {
      return Error(
        failureHeader
        + "The browser failed entirely when make an AJAX request.\n"
        + "Either there is a network issue in reaching the url, or the\n"
        + "server isn't doing the CORS things it needs to do.\n"
        + "Ensure that you're sending back: \n"
        + "  - an `access-control-allow-origin: *` header for all requests\n"
        + "  - an `access-control-allow-headers` header which lists headers such as \"Content-Type\"\n"
        + "\n"
        + "Also ensure you are able to respond to OPTION requests appropriately. \n"
        + "\n"
      );
    } else {
      return Error(
        failureHeader
        + xhr.status + ": " + xhr.statusText + " (" + xhr.responseText.replace(/\n*$/, "") + ")"
        + "\n\n"
      );
    }
  }

  function ajax(httpMethod, url, options) {
    var ajaxOptions = _.defaults((options || {}), {
      type: httpMethod,
      url: url,
      contentType: "application/json",
      dataType: "text", // so we can explicitly parse JSON and fail with more detail than jQuery usually would give us
      timeout: 30000 // so that we don't fail while waiting on a heroku dyno to spin up
    });


    var xhr = $.ajax(ajaxOptions);

    return Q.promise(function (resolve, reject) {
      xhr.success(function () {
        return resolve(xhr);
      });
      xhr.fail(function () {
        reject(interpretXhrFail(httpMethod, url, xhr));
      });
    });
  };
}

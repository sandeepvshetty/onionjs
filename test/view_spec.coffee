View = requirejs('onion/view')
$ = requirejs('jquery')

describe "View", ->

  describe "models", ->
    it "allows setting on init", ->
      view = new View(models: {bo: 'gee'})
      expect( view.models ).to.eql({bo: 'gee'})

    it "defaults to an empty object", ->
      view = new View()
      expect( view.models ).to.eql({})

  describe "dom", ->
    it "defaults to a placeholder tag with the View name", ->
      MyView = View.sub('MyView')
      view = new MyView()
      expect( view.dom.tagName ).to.equal('SCRIPT')
      expect( $(view.dom).data('view-class') ).to.equal('MyView')

  describe "attachTo", ->
    view = null

    beforeEach ->
      view = new View()

    it "returns the dom if set", ->
      element = $('<div>')[0]
      view.attachTo(element)
      expect( view.dom ).to.eql(element)

    it "allows setting on init", ->
      view = new View(attachTo: '<div>')
      assert.isTrue( $(view.dom).is('div') )

  describe "renderHTML", ->
    view = null

    beforeEach ->
      view = new View()

    it "sets the dom to the given html", ->
      view.renderHTML("<p>Hello</p>")
      expect( view.dom.outerHTML ).to.eql('<p>Hello</p>')

    it "throws an error if called with non-wrapped content", ->
      expect(->
        view.renderHTML("Hello")
      ).to.throw()

    it "throws an error if called with wrapped content but not in a single tag", ->
      expect(->
        view.renderHTML("<p>Hello</p><p>Hello</p>")
      ).to.throw()

    it "doesn't get confused with things already on the page", ->
      testParagraph = $('<p class="test-paragraph"></p>').appendTo('body')
      expect(->
        view.renderHTML("p.test-paragraph")
      ).to.throw()
      testParagraph.remove()

    it "is ok with multiline content", ->
      view.renderHTML("<p>\nHello</p>")
      expect( view.dom.outerHTML ).to.eql("<p>\nHello</p>")

    it "sets the dom on the page if attached", ->
      container = $('<div>')[0]
      element = $('<p>Hello</p>').appendTo(container)
      view.attachTo(element)
      expect( container.innerHTML ).to.eql('<p>Hello</p>')

      view.renderHTML("<span>dubble</span>")
      expect( container.innerHTML ).to.eql('<span>dubble</span>')
      expect( view.dom.outerHTML ).to.eql('<span>dubble</span>')

  describe "appendTo", ->
    view = null
    container = null

    beforeEach ->
      container = $('<div>')[0]
      view = new View()

    it "appends the DOM to the specified element", ->
      view.appendTo(container)
      expect( $(view.dom).parent()[0] ).to.equal(container)

  describe "destroy", ->
    it "removes itself from the dom", ->
      view = new View()
      view.renderHTML('<div></div>').appendTo('body')
      expect( $(view.dom).parents('body').length ).to.eql(1)
      view.destroy()
      expect( $(view.dom).parents('body').length ).to.eql(0)

  describe "toHTML", ->
    it "returns the entire html", ->
      view = new View()
      view.attachTo('<div>gruber</div>')
      expect( view.toHTML() ).to.eql('<div>gruber</div>')

  describe "events", ->

    describe "instance onDom", ->
      view = null

      beforeEach ->
        view = new View()

      afterEach ->
        view.destroy()

      it "forwards on events using onDOM", ->
        view.renderHTML('<div><a class="link">CLICK ME</a></div>')
        view.appendTo('body')
        view.onDom('.link', 'click', 'clickedYo')
        expect ->
          view.find('.link').click()
        .toEmitOn(view, 'clickedYo')

      it "still works for the outermost element", ->
        view.renderHTML('<a>CLICK ME</a>')
        view.appendTo('body')
        view.onDom('', 'click', 'clickedYo')
        expect ->
          $(view.dom).click()
        .toEmitOn(view, 'clickedYo')

      it "still works for newly added html", ->
        view.renderHTML('<div></div>')
        view.appendTo('body')
        view.onDom('.link', 'click', 'clickedYo')
        $(view.dom).append('<a class="link">CLICK ME</a>')
        expect ->
          view.find('.link').click()
        .toEmitOn(view, 'clickedYo')

      it "allows setting arguments", ->
        view.attachTo('<div></div>')
        view.onDom '', 'click', 'someEvent', -> some: 'args'
        expect ->
          $(view.dom).click()
        .toEmitOn(view, 'someEvent', some: 'args')

    describe "class onDom", ->
      class MyView extends View
      view = null

      beforeEach ->
        view = new MyView()

      afterEach ->
        view.destroy()

      assertOnDomCalled = (callback) ->
        MyView.onDom('.link', 'click', 'clickedYo')
        sinon.spy(view, 'onDom')
        assert.isFalse( view.onDom.called )
        callback()
        assert.ok( view.onDom.calledWith('.link', 'click', 'clickedYo') )

      it "calls instance onDom when attached", ->
        assertOnDomCalled ->
          view.attachTo('<div></div>')

      it "calls instance onDom when rendered", ->
        assertOnDomCalled ->
          view.renderHTML('<div></div>')

  describe "insertChild", ->
    parentView = null
    childView = null
    ParentView = ChildView = null

    assertAttachesTo = (childHTML, callback) ->
      parentHTML = """<div><p data-attach="SomeOtherView"></p>#{childHTML}</div>"""
      parentView.attachTo(parentHTML)
      callback()
      expect( parentView.toHTML() ).to.eql(parentHTML)
      expect( childView.toHTML() ).to.eql(childHTML)

    assertAppendsTo = (parentHTML, selector, callback) ->
      parentView.attachTo(parentHTML)
      element = $(parentView.dom).filter(selector).add($(parentView.dom).find(selector))
      lengthBefore = element.find(">").length
      callback()
      lengthAfter = element.find(">").length
      expect( $(childView.dom).parent().is(element) ).to.be.true
      expect( lengthAfter - lengthBefore ).to.equal(1)

    beforeEach ->
      ParentView = class ParentView extends View
      ChildView = class ChildView extends View
      parentView = new ParentView()
      childView = new ChildView(attachTo: '<a>CHILDVIEW</a>')

    it "uses data-append", ->
      assertAppendsTo '<div><p data-append="ChildView"></p></div>', 'p', ->
        parentView.insertChild(childView)

    it "uses data-attach", ->
      assertAttachesTo """<p data-attach="ChildView"></p>""", ->
        parentView.insertChild(childView)

    it "appends to main container if id not known", ->
      assertAppendsTo '<div><p></p></div>', 'div', ->
        parentView.insertChild(childView)

    it "allows specifying more than one data-append on the same element (space separated) without confusing with substrings", ->
      assertAppendsTo """<div><p data-append="ChildView something else"></p></div>""", 'p', ->
        parentView.insertChild(childView)

    it "doesn't complain if the child has no appendTo method", ->
      parentView.attachTo('<div></div>')
      parentView.insertChild({})

    describe "insertChildOfType", ->
      parentHTML = null

      beforeEach ->
        parentHTML = """<div><p></p><p class="egg"></p></div>"""

      it "specifies (overrides default) how to insert children of a type, using the params passed to insertChild", ->
        parentView.insertChildOfType "ChildView", (child, params) ->
          child.attachTo @find(".#{params.tag}")
        assertAttachesTo '<p class="egg"></p>', ->
          parentView.insertChild(childView, tag: 'egg')

      it "doesn't affect children of a different type", ->
        parentView.insertChildOfType "OtherChildView", (child, params) ->
          child.attachTo @find(".#{params.tag}")
        assertAppendsTo """<div><p class="egg"></p></div>""", 'div', ->
          parentView.insertChild(childView, tag: 'egg')

      it "works with a class declaration", ->
        ParentView.insertChildOfType "ChildView", (child, params) ->
          child.attachTo @find(".#{params.tag}")
          true
        parentView = new ParentView()
        assertAttachesTo '<p class="egg"></p>', ->
          parentView.insertChild(childView, tag: 'egg')

      # it "can map where to attach a child", ->
      #   parentView.attachChild 'ChildView', 'kiddo'
      #   childHTML= """<p data-attach="kiddo">Fried Egg</p>"""
      #   parentView.attachTo("""<div><p></p>#{childHTML}</div>""")
      #   parentView.insertChild(childView)
      #   expect( childView.toHTML() ).to.eql('<p data-attach="kiddo">Fried Egg</p>')

      # it "can find where to attach based on model data", ->
      #   parentView.attachChild 'ChildView', ({model, modelName}) -> [modelName, model.id].join(':')
      #   html = '<div><p></p><p data-attach="duck:2">Fried Egg</p></div>'
      #   parentView.attachTo(html)
      #   parentView.insertChild(childView, modelName: 'duck', model: { id: 2 })
      #   expect( childView.toHTML() ).to.eql('<p data-attach="duck:2">Fried Egg</p>')

      # it "can find where to attach based on id", ->
      #   parentView.attachChild 'ChildView', ({id}) -> id
      #   html = '<div><p></p><p data-attach="doobie">Fried Egg</p></div>'
      #   parentView.attachTo(html)
      #   parentView.insertChild(childView, id: 'doobie')
      #   expect( childView.toHTML() ).to.eql('<p data-attach="doobie">Fried Egg</p>')

      # it "can set attach rules with class declarations", ->
      #   ParentView.attachChild 'ChildView', 'hello'
      #   parentView = new ParentView(attachTo: '<div><div data-attach="hello"></div></div>')
      #   parentView.insertChild(childView)
      #   expect( childView.toHTML() ).to.eql('<div data-attach="hello"></div>')


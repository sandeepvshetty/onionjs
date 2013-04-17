ProgressiveView = requirejs('onion/progressive_view')
$ = requirejs('jquery')

describe "ProgressiveView", ->

  beforeEach ->
    $('<div id="test-app" class="test-app-class">Blah <a class="link">CLICK ME</a></div>').appendTo('body')

  afterEach ->
    $('#test-app').remove()

  describe "appendTo", ->
    view = null

    beforeEach ->
      view = new ProgressiveView()
      view.appendTo('#test-app')

    it "anchors to the specified element", ->
      expect( view.$dom().attr('class') ).to.eql('test-app-class')

  describe "events", ->
    describe "instance onDom", ->
      view = null

      beforeEach ->
        view = new ProgressiveView()
        view.appendTo('body')

      it "forwards on events using onDOM", ->
        view.onDom('.link', 'click', 'clickedYo')
        expect ->
          view.find('.link').click()
        .toEmitOn(view, 'clickedYo')

      it "still works for the outermost element", ->
        view.onDom('', 'click', 'clickedYo')
        expect ->
          view.$dom().click()
        .toEmitOn(view, 'clickedYo')

      it "allows setting arguments", ->
        view.onDom '', 'click', 'someEvent', -> some: 'args'
        expect ->
          view.$dom().click()
        .toEmitOn(view, 'someEvent', some: 'args')

  describe "class onDom", ->
    class MyView extends ProgressiveView
    view = null

    beforeEach ->
      view = new MyView()

    it "calls instance onDom when dom is set", ->
      MyView.onDom('.link', 'click', 'clickedYo')
      sinon.spy(view, 'onDom')
      assert.isFalse( view.onDom.called )
      view.setDom('<div></div>')
      assert.ok( view.onDom.calledWith('.link', 'click', 'clickedYo') )
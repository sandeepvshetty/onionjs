requirejs ['onion/errors'], (Errors) ->

  describe "Errors", ->
    errors = null

    beforeEach ->
      errors = new Errors()

    it "allows adding errors", ->
      errors.add('email', "can't be blank")
      errors.add('email', "must have a valid format")
      errors.add('name', "needs a surname")
      expect( errors.get('email') ).toEqual(["can't be blank", "must have a valid format"])
      expect( errors.get('name') ).toEqual(["needs a surname"])

    describe "isEmpty", ->
      it "is true when empty", ->
        expect( errors.isEmpty() ).toEqual(true)

      it "is false when not empty", ->
        errors.add('email', 'must exist')
        expect( errors.isEmpty() ).toEqual(false)

    describe "forEach", ->
      it "yields each error keyed on name", ->
        errors.add('email', "can't be blank")
        errors.add('email', "must have a valid format")
        errors.add('name', "needs a surname")
        array = []
        errors.forEach (name, errorsArray) ->
          array.push([name, errorsArray])
        expect( array ).toEqual([
          ['email', ["can't be blank", "must have a valid format"]]
          ['name', ["needs a surname"]]
        ])

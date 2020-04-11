describe('Test object observer', function() {
	function getTestObject() {
		return {
			editable: true,
			disabled: false,
			some: {
				element: {
					enable: true,
					one: 1,
					two: 2
				}
			}
		};
	}

	const get = Jodit.modules.Helpers.get;
	const stringify = Jodit.modules.Helpers.stringify;
	const isEqual = Jodit.modules.Helpers.isEqual;

	const A = function(result, keyA, keyB) {
		function A() {
			this.setStatus('ready');
		}

		function __() {
			this.constructor = A;
		}
		__.prototype = Jodit.modules.Component.prototype;
		A.prototype = new __();

		A.prototype.methodA = function() {
			result.push(['A', get(keyA, this)]);
		};

		A.prototype.methodB = function() {
			result.push(['B', get(keyB || keyA, this)]);
		};

		A.prototype.state = getTestObject();

		return A;
	};

	describe('Test watch decorator', function() {
		it('Should add watcher to whole field object', function() {
			const result = [],
				AClass = A(result, 'state.editable');

			Jodit.decorators.watch('state')(AClass.prototype, 'methodA');

			const a = new AClass();

			a.state = Object.assign({}, a.state, {
				editable: false
			});

			a.state = Object.assign({}, a.state, {
				editable: true
			});

			expect(result).to.deep.equal([
				['A', false],
				['A', true]
			]);
		});

		it('Should add watcher to some field in Component', function() {
			const result = [],
				AClass = A(result, 'state.some.element.enable');

			Jodit.decorators.watch('state.some.element.enable')(
				AClass.prototype,
				'methodA'
			);

			const a = new AClass();

			a.state.some.element.enable = false;
			a.state.some.element.enable = true;

			expect(result).to.deep.equal([
				['A', false],
				['A', true]
			]);
		});

		describe('Add several watchers', function() {
			describe('on same fields', function() {
				it('Should call all handlers', function() {
					const result = [],
						AClass = A(result, 'state.some.element.enable');

					Jodit.decorators.watch('state.some.element.enable')(
						AClass.prototype,
						'methodA'
					);

					Jodit.decorators.watch('state.some.element.enable')(
						AClass.prototype,
						'methodB'
					);

					const a = new AClass();

					a.state.some.element.enable = false;
					a.state.some.element.enable = true;

					expect(result).to.deep.equal([
						['A', false],
						['B', false],
						['A', true],
						['B', true]
					]);
				});
			});

			describe('on different fields', function() {
				it('Should call only matched handlers', function() {
					const result = [],
						AClass = A(
							result,
							'state.some.element.one',
							'state.some.element.two'
						);

					Jodit.decorators.watch('state.some.element.one')(
						AClass.prototype,
						'methodA'
					);

					Jodit.decorators.watch('state.some.element.two')(
						AClass.prototype,
						'methodB'
					);

					const a = new AClass();

					a.state.some.element.enable = false; // indifferent

					a.state.some.element.one = 2; // call methodA
					a.state.some.element.two = 3; // call methodB

					expect(result).to.deep.equal([
						['A', 2],
						['B', 3]
					]);
				});
			});
		});
	});

	describe('Test safe stringify', function() {
		it('Should safe stringify any circular object to string', function() {
			const a = {},
				b = getTestObject();

			expect(stringify(a)).equals('{}');

			expect(stringify(b)).equals(
				'{"editable":true,"disabled":false,"some":{"element":{"enable":true,"one":1,"two":2}}}'
			);

			b.b = b;
			expect(stringify(b)).equals(
				'{"editable":true,"disabled":false,"some":{"element":{"enable":true,"one":1,"two":2}},"b":"[refObject]"}'
			);
		});
	});

	describe('Test equal checker', function() {
		describe('Two object', function() {
			describe('Check one object', function() {
				it('Should check that is one object', function() {
					const a = {},
						b = [];

					expect(isEqual(a, a)).is.true;
					expect(isEqual(b, b)).is.true;
					expect(isEqual(a, b)).is.false;
				});
			});

			describe('Check scalar value', function() {
				it('Should check normal', function() {
					expect(
						isEqual(
							function() {},
							function() {}
						)
					).is.true;

					expect(
						isEqual(
							function() {
								return 1;
							},
							function() {}
						)
					).is.false;

					expect(isEqual(1, 1)).is.true;
					expect(isEqual(1, 2)).is.false;
					expect(isEqual(true, true)).is.true;
					expect(isEqual(1.0, 1)).is.true;
					expect(isEqual('1', 1)).is.true;
				});
			});

			describe('Check array', function() {
				it('Should deep check', function() {
					expect(isEqual([1], [1])).is.true;
					expect(isEqual([1], [2])).is.false;
					expect(isEqual(['test'], ['test'])).is.true;
					expect(isEqual(['test'], ['test', 1])).is.false;
				});
			});

			describe('Check ref object', function() {
				it('Should deep check and add instead ref some const', function() {
					const a = getTestObject(),
						b = getTestObject();

					expect(isEqual(a, b)).is.true;

					a.b = b;
					b.b = a;

					expect(isEqual(a, b)).is.true;

					a.b = 1;
					b.b = 2;

					expect(isEqual(a, b)).is.false;

					expect(isEqual(window, document)).is.false;
				});
			});
		});
	});

	describe('Event on change', function() {
		it('Should fire event when field value was changed', function() {
			const counter = [];

			const data = Jodit.modules.ObserveObject.create(getTestObject());

			data.on('change', function(key) {
				counter.push(key);
			});

			data.editable = false;
			data.editable = false;

			data.some.element.two = 2;
			data.some.element.one = 2;

			expect(counter).to.deep.equal(['editable', 'some.element.one']);
		});

		describe('Key change event', function() {
			it('Should fire event.key when field value was changed', function() {
				const counter = [];

				const data = Jodit.modules.ObserveObject.create(
					getTestObject()
				);

				data.on('change.some.element.one', function(key) {
					counter.push(key);
				});

				data.editable = false;
				data.editable = false;

				data.some.element.two = 2;
				data.some.element.one = 2;

				expect(counter).to.deep.equal(['some.element.one']);
			});
		});

		describe('Change whole branch', function() {
			it('Should fire event.key when field value was changed', function() {
				const counter = [];

				const data = Jodit.modules.ObserveObject.create(
					getTestObject()
				);

				data.on(['change.some.element.test', 'change.some'], function(
					key
				) {
					counter.push(key);
				});

				data.some = {
					element: {
						test: 1
					}
				};

				data.some.element.test = 2;

				expect(counter).to.deep.equal(['some', 'some.element.test']);
			});
		});
	});
});
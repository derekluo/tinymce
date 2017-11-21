test(
  'api.Strings.splits',

  [
    'ephox.polaris.api.Strings'
  ],

  function (Strings) {
    var check = function (expected, input, points) {
      var actual = Strings.splits(input, points);
      assert.eq(expected, actual);
    };

    check([ '' ], '', [ ]);
    check([ 'a' ], 'a', [ ]);
    check([ 'a' ], 'a', [ 0 ]);
    check([ 'a' ], 'a', [ 1 ]);
    check([ 'a', 'b', 'c' ], 'abc', [ 0, 1, 2, 3 ]);
    check([ 'ab', 'cdef', 'ghi' ], 'abcdefghi', [ 2, 6 ]);
  }
);
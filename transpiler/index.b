function test(element)
  condition element != null
  condition element.nodeName == 'P'

  local x = 10

  test->querySelector('test')

  if x > test->asdf->querySelector('test') then
    print('test', 10, 20)
  else
    print('asdgr')
  end

  local a = {
    test = 10,
    asfdg = {
      xvcb = 10,
      terh = 'tdgs'
    }
  }

  window.scrollTo({
    top = 0,
    left = 0
  })
end

local numbers = do
  local arr = []
  for i = 0 to 5
    arr.push(i)
  end
  return arr
end

for i = 0 to #numbers - 1
  print(numbers[i])
end

local arr = [1, 2, 3, 4, 5]

for i = 0, 10
  print(i)
end

for i = 0, #arr - 1
  print(arr[i])
end

function loopOver(arr, func)
  local results = []
  for i = 0, length(arr) - 1
    results.push(func(arr[i]))
  end
  return results
end

local overResult = loopOver(arr, function(item)
  return 'hallo ' + item
end)

print(overResult)

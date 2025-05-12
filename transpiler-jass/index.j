typedef integer INT
typedef integer INT32

function Divide takes integer a, integer b returns integer
  expect a != 0
  expect b != 0

  return a / b
endfunction

function Main takes nothing returns nothing
  local array result
  
  local array arr1 = [1, 2, 3, 4, 5]
  local array arr2 = Array('a', 'b', 'c', 'd', 'e')

  local INT32 arr1Length = Length(arr1)
  local INT32 arr2Length = Length(arr2)
  
  local INT32 i = 0
  local INT32 j = 0

  local INT32 pi = ref i

  loop
    exitwhen i >= arr1Length and j >= arr2Length

    if i < arr1Length then
      set result[i + j] = arr1[i]
      set i = i + 1
    endif

    if j < arr2Length then
      set result[i + j] = arr2[j]
      set j = j + 1
    endif
  endloop
endfunction

call Main()

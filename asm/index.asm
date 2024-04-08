.data
  myString byte "Hallo Welt"
  myValue real4 35.54

.code
  MyProcedure proc a:dword, b:dword
    push a
    call log
    push b
    call log
  MyProcedure endp

  mov eax, 256
  invoke MyProcedure, eax, 50
end

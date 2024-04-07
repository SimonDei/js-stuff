.code
  mov eax, 40

  MyProcedure proc a:dword, b:dword
    log a, b
  MyProcedure endp

  invoke MyProcedure, eax, 50
end

.data
    myString byte "Hallo Welt"
    myValue real4 35.54
    myElement byte ?

.code
    Print proc str:byte
        push str
        call log
    Print endp

    Query proc selector:byte
        invoke QuerySelector, selector
        .erre r1, "Failed to load"
    Query endp

    mov r2, catstr "test", "123"

    invoke Query, "body"
    invoke log, r1
end


.data
    numberOne byte 5
    numberTwo byte 8
    result byte 0
    updateInterval byte ?

.code
    invoke QuerySelector, "p"
    mov eax, sizeof r1

    mov r2, "Hallo Welt"
    invoke Log, sizestr r2

    UpdateThumbnail proc index:byte
        invoke QuerySelector, catstr "#thumb", index
        mov r3, r1

        invoke GetProperty, "src"        
        mov r1, r2

        invoke Slice, -1
    UpdateThumbnail endp

    AddNums proc a:byte, b:byte
        push eax
        mov eax, a
        add eax, b
        push eax
        call Log
        pop eax
    AddNums endp

    SubNums proc a:byte, b:byte
        push eax
        mov eax, a
        sub eax, b
        push eax
        call Log
        pop eax
    SubNums endp

    invoke AddNums, numberOne, numberTwo
    invoke SubNums, numberTwo, numberOne

    invoke DumpRegisters
end

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

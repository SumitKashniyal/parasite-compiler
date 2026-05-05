def fibonacci(count):
    x, y = 0, 1
    for i in range(count):
        print(x, end=" ")
        x, y = y, x + y

terms = int(input("Terms: "))
fibonacci(terms)

a = int(input("\nEnter first number: "))
b = int(input("Enter second number: "))
print("Addition:", a + b)
def factorial(n):
    f = 1
    for i in range(1, n + 1):
        f *= i
    return f

num = int(input("Enter a number: "))
print("Factorial:", factorial(num))

if num % 2 == 0:
    print("Even number")
else:
    print("Odd number")
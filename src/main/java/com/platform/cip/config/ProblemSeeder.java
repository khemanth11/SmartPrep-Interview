package com.platform.cip.config;

import com.platform.cip.document.Difficulty;
import com.platform.cip.document.Problem;
import com.platform.cip.document.TestCase;
import com.platform.cip.repository.ProblemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class ProblemSeeder implements CommandLineRunner {

        private final ProblemRepository problemRepository;

        @Override
        public void run(String... args) throws Exception {
                // Clear existing problems to ensure fresh LeetCode-style stubs and drivers are
                // seeded
                problemRepository.deleteAll();

                // 1. Seed "Two Sum" challenge
                Problem twoSum = Problem.builder()
                                .title("Two Sum")
                                .description(
                                                "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.")
                                .difficulty(Difficulty.EASY)
                                .tags(List.of("Array", "Hash Table"))
                                .inputFormat(
                                                "The first line contains integers separated by spaces representing the array `nums`.\nThe second line contains the `target` integer.")
                                .outputFormat("Print two indices separated by a space.")
                                .constraints(
                                                "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.")
                                .systemTemplate("""
                                                class Solution:
                                                    def twoSum(self, nums: list[int], target: int) -> list[int]:
                                                        # Write your Python 3 code here
                                                        pass
                                                """)
                                .driverCode("""
                                                import sys

                                                def solve():
                                                    lines = sys.stdin.read().splitlines()
                                                    if not lines:
                                                        return
                                                    nums = list(map(int, lines[0].split()))
                                                    target = int(lines[1])

                                                    sol = Solution()
                                                    res = sol.twoSum(nums, target)
                                                    if res is not None:
                                                        print(" ".join(map(str, res)))

                                                solve()
                                                """)
                                .jsTemplate("""
                                                class Solution {
                                                    twoSum(nums, target) {
                                                        // Write your JS code here

                                                    }
                                                }
                                                """)
                                .jsDriverCode("""
                                                const fs = require('fs');

                                                function solve() {
                                                    const input = fs.readFileSync(0, 'utf-8').trim();
                                                    if (!input) return;
                                                    const lines = input.split(/\\r?\\n/);
                                                    const nums = lines[0].split(/\\s+/).map(Number);
                                                    const target = Number(lines[1]);

                                                    const sol = new Solution();
                                                    const res = sol.twoSum(nums, target);
                                                    if (res !== undefined && res !== null) {
                                                        console.log(res.join(" "));
                                                    }
                                                }

                                                solve();
                                                """)
                                .sampleTestCases(List.of(
                                                TestCase.builder().input("2 7 11 15\n9").output("0 1").build(),
                                                TestCase.builder().input("3 2 4\n6").output("1 2").build()))
                                .hiddenTestCases(List.of(
                                                TestCase.builder().input("3 3\n6").output("0 1").build(),
                                                TestCase.builder().input("1 5 8 12\n20").output("2 3").build()))
                                .category("Arrays & Hashing")
                                .moduleOrder(1)
                                .build();

                // 2. Seed "Palindrome Number" challenge
                Problem palindrome = Problem.builder()
                                .title("Palindrome Number")
                                .description("Given an integer `x`, return `true` if `x` is a palindrome, and `false` otherwise.")
                                .difficulty(Difficulty.EASY)
                                .tags(List.of("Math"))
                                .inputFormat("A single integer `x`.")
                                .outputFormat("Print `true` if palindrome, else `false`.")
                                .constraints("-2^31 <= x <= 2^31 - 1")
                                .systemTemplate("""
                                                class Solution:
                                                    def isPalindrome(self, x: int) -> bool:
                                                        # Write your Python 3 code here
                                                        pass
                                                """)
                                .driverCode("""
                                                import sys

                                                def solve():
                                                    lines = sys.stdin.read().splitlines()
                                                    if not lines:
                                                        return
                                                    x = int(lines[0].strip())

                                                    sol = Solution()
                                                    res = sol.isPalindrome(x)
                                                    if res is True:
                                                        print("true")
                                                    elif res is False:
                                                        print("false")
                                                    elif res is not None:
                                                        print(str(res).lower())

                                                solve()
                                                """)
                                .jsTemplate("""
                                                class Solution {
                                                    isPalindrome(x) {
                                                        // Write your JS code here

                                                    }
                                                }
                                                """)
                                .jsDriverCode("""
                                                const fs = require('fs');

                                                function solve() {
                                                    const input = fs.readFileSync(0, 'utf-8').trim();
                                                    if (!input) return;
                                                    const x = Number(input.trim());

                                                    const sol = new Solution();
                                                    const res = sol.isPalindrome(x);
                                                    if (res !== undefined && res !== null) {
                                                        console.log(res.toString());
                                                    }
                                                }

                                                solve();
                                                """)
                                .sampleTestCases(List.of(
                                                TestCase.builder().input("121").output("true").build(),
                                                TestCase.builder().input("-121").output("false").build()))
                                .hiddenTestCases(List.of(
                                                TestCase.builder().input("10").output("false").build(),
                                                TestCase.builder().input("12321").output("true").build()))
                                .category("Math & Algorithms")
                                .moduleOrder(4)
                                .build();

                // 3. Seed "FizzBuzz" challenge
                Problem fizzBuzz = Problem.builder()
                                .title("FizzBuzz")
                                .description("Given an integer `n`, return a string array answer (1-indexed) where:\n- `answer[i] == \"FizzBuzz\"` if `i` is divisible by 3 and 5.\n- `answer[i] == \"Fizz\"` if `i` is divisible by 3.\n- `answer[i] == \"Buzz\"` if `i` is divisible by 5.\n- `answer[i] == i` (as a string) if none of the conditions are met.")
                                .difficulty(Difficulty.EASY)
                                .tags(List.of("Math", "String"))
                                .inputFormat("A single integer `n`.")
                                .outputFormat("Print elements separated by a space.")
                                .constraints("1 <= n <= 10^4")
                                .systemTemplate("""
                                                class Solution:
                                                    def fizzBuzz(self, n: int) -> list[str]:
                                                        # Write your Python 3 code here
                                                        pass
                                                """)
                                .driverCode("""
                                                import sys

                                                def solve():
                                                    lines = sys.stdin.read().splitlines()
                                                    if not lines:
                                                        return
                                                    n = int(lines[0].strip())

                                                    sol = Solution()
                                                    res = sol.fizzBuzz(n)
                                                    if res is not None:
                                                        print(" ".join(res))

                                                solve()
                                                """)
                                .jsTemplate("""
                                                class Solution {
                                                    fizzBuzz(n) {
                                                        // Write your JS code here

                                                    }
                                                }
                                                """)
                                .jsDriverCode("""
                                                const fs = require('fs');

                                                function solve() {
                                                    const input = fs.readFileSync(0, 'utf-8').trim();
                                                    if (!input) return;
                                                    const n = Number(input.trim());

                                                    const sol = new Solution();
                                                    const res = sol.fizzBuzz(n);
                                                    if (res !== undefined && res !== null) {
                                                        console.log(res.join(" "));
                                                    }
                                                }

                                                solve();
                                                """)
                                .sampleTestCases(List.of(
                                                TestCase.builder().input("3").output("1 2 Fizz").build(),
                                                TestCase.builder().input("5").output("1 2 Fizz 4 Buzz").build()))
                                .hiddenTestCases(List.of(
                                                TestCase.builder().input("15").output(
                                                                "1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz")
                                                                .build()))
                                .category("Math & Algorithms")
                                .moduleOrder(4)
                                .build();

                // 4. Seed "Reverse String" challenge
                Problem reverseString = Problem.builder()
                                .title("Reverse String")
                                .description("Write a function that reverses a string. The input string is given as an array of characters `s`.\n\nYou must do this by modifying the input array in-place with O(1) extra memory.")
                                .difficulty(Difficulty.EASY)
                                .tags(List.of("Two Pointers", "String"))
                                .inputFormat("Space-separated characters representing the array `s`.")
                                .outputFormat("Print the reversed characters separated by a space.")
                                .constraints("1 <= s.length <= 10^5")
                                .systemTemplate("""
                                                class Solution:
                                                    def reverseString(self, s: list[str]) -> None:
                                                        # Do not return anything, modify s in-place instead.
                                                        pass
                                                """)
                                .driverCode("""
                                                import sys

                                                def solve():
                                                    lines = sys.stdin.read().splitlines()
                                                    if not lines:
                                                        return
                                                    s = lines[0].split()

                                                    sol = Solution()
                                                    sol.reverseString(s)
                                                    print(" ".join(s))

                                                solve()
                                                """)
                                .jsTemplate("""
                                                class Solution {
                                                    reverseString(s) {
                                                        // Do not return anything, modify s in-place instead.

                                                    }
                                                }
                                                """)
                                .jsDriverCode("""
                                                const fs = require('fs');

                                                function solve() {
                                                    const input = fs.readFileSync(0, 'utf-8').trim();
                                                    if (!input) return;
                                                    const s = input.split(/\\s+/);

                                                    const sol = new Solution();
                                                    sol.reverseString(s);
                                                    console.log(s.join(" "));
                                                }

                                                solve();
                                                """)
                                .sampleTestCases(List.of(
                                                TestCase.builder().input("h e l l o").output("o l l e h").build(),
                                                TestCase.builder().input("H a n n a h").output("h a n n a H").build()))
                                .hiddenTestCases(List.of(
                                                TestCase.builder().input("a b c").output("c b a").build(),
                                                TestCase.builder().input("x y z w").output("w z y x").build()))
                                .category("Strings")
                                .moduleOrder(2)
                                .build();

                // 5. Seed "Valid Parentheses" challenge
                Problem validParentheses = Problem.builder()
                                .title("Valid Parentheses")
                                .description("Given a string `s` containing just the characters `'('`, `')'`, `'{'`, `'}'`, `'['` and `']'`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.")
                                .difficulty(Difficulty.EASY)
                                .tags(List.of("Stack", "String"))
                                .inputFormat("A single string `s`.")
                                .outputFormat("Print `true` if valid, else `false`.")
                                .constraints("1 <= s.length <= 10^4\ns consists of parentheses only.")
                                .systemTemplate("""
                                                class Solution:
                                                    def isValid(self, s: str) -> bool:
                                                        # Write your Python 3 code here
                                                        pass
                                                """)
                                .driverCode("""
                                                import sys

                                                def solve():
                                                    lines = sys.stdin.read().splitlines()
                                                    if not lines:
                                                        return
                                                    s = lines[0].strip()

                                                    sol = Solution()
                                                    res = sol.isValid(s)
                                                    if res is True:
                                                        print("true")
                                                    elif res is False:
                                                        print("false")
                                                    elif res is not None:
                                                        print(str(res).lower())

                                                solve()
                                                """)
                                .jsTemplate("""
                                                class Solution {
                                                    isValid(s) {
                                                        // Write your JS code here

                                                    }
                                                }
                                                """)
                                .jsDriverCode("""
                                                const fs = require('fs');

                                                function solve() {
                                                    const input = fs.readFileSync(0, 'utf-8').trim();
                                                    if (!input) return;
                                                    const s = input.trim();

                                                    const sol = new Solution();
                                                    const res = sol.isValid(s);
                                                    if (res !== undefined && res !== null) {
                                                        console.log(res.toString());
                                                    }
                                                }

                                                solve();
                                                """)
                                .sampleTestCases(List.of(
                                                TestCase.builder().input("()").output("true").build(),
                                                TestCase.builder().input("()[]{}").output("true").build(),
                                                TestCase.builder().input("(]").output("false").build()))
                                .hiddenTestCases(List.of(
                                                TestCase.builder().input("([)]").output("false").build(),
                                                TestCase.builder().input("{[]}").output("true").build()))
                                .category("Stack & Queues")
                                .moduleOrder(3)
                                .build();

                // Save all problems to database
                problemRepository.saveAll(List.of(twoSum, palindrome, fizzBuzz, reverseString, validParentheses));
                System.out.println("Problems seeded successfully!");
        }
}

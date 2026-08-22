-- One formula in the source question bank arrived corrupted: the backslashes
-- of \times, \frac and \bullet had been swallowed as control characters
-- (tab, formfeed, backspace) by whatever produced question_bank.json, leaving
-- "2 imes 10^{-5}/^{ rac{}{ ext{}}}". It is the only such string in the 1,800
-- seeded questions, and it will not render as maths until it is repaired.
--
-- Rewritten as the standard notation for a coefficient of linear expansion.
-- Matched on the broken text so this is a no-op once applied, and so it cannot
-- touch a question that has already been corrected.

UPDATE questions
   SET question_text =
       'A metal rod having a coefficient of linear expansion of '
       || '$2 \times 10^{-5}/^\circ\text{C}$'
       || ' has a length of $100\text{ cm}$ at $20^\circ\text{C}$'
       || '. The temperature at which it is shortened by $1\text{ mm}$ is'
 WHERE question_text LIKE '%imes 10^{-5}/^{%rac{}{%';

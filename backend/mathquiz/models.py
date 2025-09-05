from django.db import models

# Create your models here.
from django.db import models
import random

class Question(models.Model):
    title = models.CharField(max_length=255)
    question = models.TextField()
    football_count = models.IntegerField(default=0)
    show_addition = models.BooleanField(default=False)
    first_group = models.IntegerField(null=True, blank=True)
    second_group = models.IntegerField(null=True, blank=True)
    options = models.JSONField()  # stores list like [1,2,3,4]
    correct_answer = models.IntegerField()
    explanation = models.TextField()

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "question": self.question,
            "footballCount": self.football_count,
            "showAddition": self.show_addition,
            "firstGroup": self.first_group,
            "secondGroup": self.second_group,
            "options": self.options,
            "correctAnswer": self.correct_answer,
            "explanation": self.explanation,
        }

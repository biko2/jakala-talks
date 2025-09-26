'use client'

import React, { useState } from 'react'
import { X } from 'lucide-react'
import {
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalTitle,
  CloseButton,
  Form,
  FormGroup,
  Label,
  Input,
  Textarea,
  Select,
  ButtonGroup,
  CancelButton,
  SubmitButton,
  ErrorMessage,
  CharacterCount,
  LabelContainer
} from './CreateTalkModal.styles'

interface CreateTalkModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (title: string, description: string, duration: number) => Promise<void>
}

export default function CreateTalkModal({ isOpen, onClose, onSubmit }: CreateTalkModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState(30)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('El título es obligatorio')
      return
    }

    if (title.length > 50) {
      setError('El título no puede exceder los 50 caracteres')
      return
    }

    if (!description.trim()) {
      setError('La descripción es obligatoria')
      return
    }

    if (description.length > 400) {
      setError('La descripción no puede exceder los 400 caracteres')
      return
    }

    if (duration !== 30 && duration !== 45) {
      setError('La duración debe ser de 30 o 45 minutos')
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit(title.trim(), description.trim(), duration)
      setTitle('')
      setDescription('')
      setDuration(30)
      onClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al crear la charla')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle('')
      setDescription('')
      setDuration(30)
      setError('')
      onClose()
    }
  }

  // Prevenir scroll del body cuando el modal está abierto
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    // Cleanup cuando el componente se desmonta
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <ModalOverlay onClick={handleClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>Nueva Charla</ModalTitle>
          <CloseButton onClick={handleClose} disabled={isSubmitting} aria-label="Cerrar modal">
            <X size={20} />
          </CloseButton>
        </ModalHeader>

        <Form onSubmit={handleSubmit}>
          <FormGroup>
            <LabelContainer>
              <Label htmlFor="title">Título</Label>
              <CharacterCount>{title.length}/50</CharacterCount>
            </LabelContainer>
            <Input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título de la charla"
              disabled={isSubmitting}
              maxLength={50}
            />
          </FormGroup>

          <FormGroup>
            <LabelContainer>
              <Label htmlFor="description">Descripción</Label>
              <CharacterCount>{description.length}/400</CharacterCount>
            </LabelContainer>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe brevemente de qué trata la charla"
              disabled={isSubmitting}
              maxLength={400}
              rows={10}
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="duration">Duración</Label>
            <Select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              disabled={isSubmitting}
            >
              <option value={30}>30 minutos</option>
              <option value={45}>45 minutos</option>
            </Select>
          </FormGroup>

          {error && <ErrorMessage>{error}</ErrorMessage>}

          <ButtonGroup>
            <CancelButton type="button" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </CancelButton>
            <SubmitButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creando...' : 'Crear Charla'}
            </SubmitButton>
          </ButtonGroup>
        </Form>
      </ModalContent>
    </ModalOverlay>
  )
}
